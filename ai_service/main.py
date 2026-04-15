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

SYSTEM_PROMPT = """
You are the intelligent assistant for AeroTrack (IFDC Asset Management). 
You must understand our specific database logic and schema:

1. 'Admissions' (admissions table) are parent projects that contain a project name, purpose, start/end dates, and an approval status (pending, approved, rejected).
2. 'Assets' are assigned to Users via Admissions.
3. Assets have states: 'available', 'maintenance', or 'in_use'.
4. Drones track 'Total Flight Hours'.

DATABASE SCHEMA:
- Table 'users': id, email, full_name, role, position.
- Table 'admissions': id, project_name, purpose, start_date, end_date, status, user_id, rejection_reason.
- Table 'admission_assets': id, admission_id, asset_id, asset_type, status. (Links admissions to specific assets).
- Table 'drone_assets': id, name, model, serial_number, status, total_flight_hours.
- Table 'office_assets': id, name, category, serial_number, status.
- Table 'rnd_assets': id, name, asset_type, serial_number, status, is_classified.
- Table 'vehicle_assets': id, name, license_plate, status, mileage.
- Table 'battery_assets': id, name, model, serial_number, status, cycle_count.

BUSINESS RULES:
- When a user asks you a question about operations, refer strictly to this hierarchical logic. 
- Admissions are PARENT projects. Assets (Drones, Batteries, etc.) are CHILDREN of Admissions.
- To find out what project an asset is on, you must look at its active Admission link.
- Never assume an asset can be checked out without an APPROVED Admission.
- If an asset is in 'maintenance' status, it cannot be reserved or used.
- For vehicle queries, specifically use 'license_plate' as the identifier.
"""

genai.configure(api_key=GEMINI_API_KEY)
# Using gemini-2.5-flash with persistent system instructions
model = genai.GenerativeModel(
    model_name='gemini-2.5-flash',
    system_instruction=SYSTEM_PROMPT
)

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
    # Core logic and schema are now handled by SYSTEM_PROMPT in system_instruction
    context_prompt = f"Live Database State:\n{db_data}\n\nUser Question: {chat_req.message}"
    
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
