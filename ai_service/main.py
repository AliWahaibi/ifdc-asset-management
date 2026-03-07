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
            # Get count of available assets
            drone_count = conn.execute(text("SELECT COUNT(*) FROM drone_assets WHERE status = 'available' AND deleted_at IS NULL")).scalar()
            office_count = conn.execute(text("SELECT COUNT(*) FROM office_assets WHERE status = 'available' AND deleted_at IS NULL")).scalar()
            rnd_count = conn.execute(text("SELECT COUNT(*) FROM rnd_assets WHERE status = 'available' AND deleted_at IS NULL")).scalar()
            
            snapshot["total_available_drones"] = drone_count
            snapshot["total_available_office"] = office_count
            snapshot["total_available_rnd"] = rnd_count

            # Get approved reservations and their assignees (JOIN users table on user_id)
            reservations_query = text("""
                SELECT r.asset_type, r.asset_id, u.full_name
                FROM reservations r
                JOIN users u ON r.user_id = u.id
                WHERE r.status = 'approved' AND r.deleted_at IS NULL
            """)
            result = conn.execute(reservations_query).mappings().fetchall()
            
            active_res = []
            for row in result:
                asset_name = f"Unknown {row['asset_type']}"
                if row['asset_type'] == 'drone':
                    name = conn.execute(text("SELECT name FROM drone_assets WHERE id = :id"), {"id": row['asset_id']}).scalar()
                    if name: asset_name = name
                elif row['asset_type'] == 'office':
                    name = conn.execute(text("SELECT name FROM office_assets WHERE id = :id"), {"id": row['asset_id']}).scalar()
                    if name: asset_name = name
                elif row['asset_type'] == 'rnd':
                    name = conn.execute(text("SELECT name FROM rnd_assets WHERE id = :id"), {"id": row['asset_id']}).scalar()
                    if name: asset_name = name
                    
                active_res.append({
                    "asset_type": row['asset_type'],
                    "asset_name": asset_name,
                    "user_name": row['full_name']
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
