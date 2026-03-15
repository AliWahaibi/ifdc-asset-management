import os
import json
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import create_engine, text
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()

limiter = Limiter(key_func=get_remote_address)
app = FastAPI()
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
DATABASE_URL = os.getenv("DATABASE_URL")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY must be set in .env")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL must be set in .env")

genai.configure(api_key=GEMINI_API_KEY)
# Using gemini-2.5-flash as requested
model = genai.GenerativeModel('gemini-2.5-flash')

engine = create_engine(DATABASE_URL)

class ChatRequest(BaseModel):
    message: str = Field(..., max_length=1000, description="The user prompt to the AI. Strict length limit enforced.")

def get_database_snapshot() -> str:
    snapshot = {}
    try:
        with engine.connect() as conn:
            # 1. Fetch all asset names and IDs first for fast lookup
            asset_map = {} # { "uuid": "Asset Name" }
            
            def fetch_assets(table, type_key):
                # Get names
                rows = conn.execute(text(f"SELECT id, name FROM {table}")).fetchall()
                for r in rows:
                    asset_map[str(r[0])] = r[1]
                
                # Get available count
                count = conn.execute(text(f"SELECT COUNT(*) FROM {table} WHERE status = 'available' AND deleted_at IS NULL")).scalar()
                snapshot[f"total_available_{type_key}"] = count

            fetch_assets("drone_assets", "drones")
            fetch_assets("office_assets", "office")
            fetch_assets("rnd_assets", "rnd")
            fetch_assets("vehicle_assets", "vehicles")

            # 2. Get approved reservations
            reservations_query = text("""
                SELECT r.asset_type, r.asset_id, r.start_date, r.end_date, u.full_name
                FROM reservations r
                JOIN users u ON r.user_id = u.id
                WHERE r.status = 'approved' AND r.deleted_at IS NULL
            """)
            result = conn.execute(reservations_query).mappings().fetchall()
            
            active_res = []
            for row in result:
                asset_id = str(row['asset_id'])
                asset_name = asset_map.get(asset_id, f"Unknown {row['asset_type']}")
                    
                active_res.append({
                    "asset_type": row['asset_type'],
                    "asset_name": asset_name,
                    "reserved_by": row['full_name'],
                    "start": str(row['start_date']),
                    "end": str(row['end_date'])
                })
                
            snapshot["active_reservations"] = active_res
            return json.dumps(snapshot, indent=2)
    except Exception as e:
        print(f"Database query error: {e}")
        return json.dumps({"error": "Failed to retrieve full live database state."})

@app.post("/api/ai/chat")
@limiter.limit("10/minute")
async def ai_chat(request: Request, chat_req: ChatRequest):
    if not chat_req.message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    db_data = get_database_snapshot()
    context_prompt = f"System Context: Here is the live database state:\n{db_data}\n\nUsing this data, strictly answer the User Prompt below in a helpful manner. Do not mention that you are reading JSON data, just provide the facts natively.\nUser Prompt: {chat_req.message}"
    
    # Simple terminal logging to verify injection payload
    print(f"\n--- INJECTING DB PAYLOAD ---\n{db_data}\n----------------------------\n")
    
    try:
        response = model.generate_content(context_prompt)
        return {"response": response.text}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        # Return a graceful JSON error payload instead of crashing FastAPI
        return {"response": f"AI provider currently unavailable. Details: {str(e)}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
