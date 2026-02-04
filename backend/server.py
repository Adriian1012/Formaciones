from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import hashlib
import jwt
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'formacion-salones-secret-key-2024')
JWT_ALGORITHM = 'HS256'

# SendGrid Config
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', '')

app = FastAPI(title="Formación Salones API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str
    assigned_salons: List[str] = []
    created_at: str

class SalonCreate(BaseModel):
    name: str
    address: Optional[str] = ""
    city: Optional[str] = "Murcia"

class SalonUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None

class SalonResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    address: str
    city: str
    created_at: str

class EmployeeCreate(BaseModel):
    name: str
    salon_id: str
    level: str = "Principiante"
    notes: Optional[str] = ""

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    salon_id: Optional[str] = None
    level: Optional[str] = None
    notes: Optional[str] = None

class EmployeeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    salon_id: str
    salon_name: Optional[str] = ""
    level: str
    notes: str
    trainings_count: int = 0
    created_at: str

class TrainingTypeCreate(BaseModel):
    name: str
    description: Optional[str] = ""

class TrainingTypeResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    created_at: str

class TrainingCreate(BaseModel):
    employee_id: str
    training_type_id: str
    notes: Optional[str] = ""
    level_after: Optional[str] = None

class TrainingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_name: Optional[str] = ""
    training_type_id: str
    training_type_name: Optional[str] = ""
    coordinator_id: str
    coordinator_name: Optional[str] = ""
    notes: str
    level_before: str
    level_after: str
    date: str

class ScheduledTrainingCreate(BaseModel):
    employee_id: str
    training_type_id: str
    scheduled_date: str
    notes: Optional[str] = ""

class ScheduledTrainingResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    employee_id: str
    employee_name: Optional[str] = ""
    training_type_id: str
    training_type_name: Optional[str] = ""
    salon_name: Optional[str] = ""
    coordinator_id: str
    scheduled_date: str
    notes: str
    reminder_sent: bool
    completed: bool
    created_at: str

class AssignSalonsRequest(BaseModel):
    coordinator_id: str
    salon_ids: List[str]

class StatsResponse(BaseModel):
    total_employees: int
    total_trainings: int
    trainings_this_month: int
    employees_by_level: dict
    trainings_by_type: dict
    upcoming_trainings: int

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def create_token(user_id: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Acceso denegado. Se requiere rol de administrador")
    return user

def send_reminder_email(to_email: str, employee_name: str, training_type: str, scheduled_date: str, salon_name: str):
    """Send reminder email via SendGrid"""
    if not SENDGRID_API_KEY or not SENDER_EMAIL:
        logger.warning("SendGrid not configured, skipping email")
        return False
    
    html_content = f"""
    <html>
        <body style="font-family: Inter, sans-serif; background-color: #0F172A; color: #F8FAFC; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: #1E293B; border-radius: 8px; padding: 30px;">
                <h1 style="color: #10B981; font-family: 'Barlow Condensed', sans-serif;">RECORDATORIO DE FORMACIÓN</h1>
                <p>Tienes una formación programada para mañana:</p>
                <div style="background: #020617; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Empleado/a:</strong> {employee_name}</p>
                    <p><strong>Tipo de formación:</strong> {training_type}</p>
                    <p><strong>Fecha:</strong> {scheduled_date}</p>
                    <p><strong>Salón:</strong> {salon_name}</p>
                </div>
                <p style="color: #94A3B8; font-size: 12px;">Este es un recordatorio automático del sistema de formación.</p>
            </div>
        </body>
    </html>
    """
    
    message = Mail(
        from_email=SENDER_EMAIL,
        to_emails=to_email,
        subject=f"Recordatorio: Formación de {employee_name} mañana",
        html_content=html_content
    )
    
    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        logger.info(f"Email sent to {to_email}, status: {response.status_code}")
        return response.status_code == 202
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Check if this is the first user (becomes admin)
    user_count = await db.users.count_documents({})
    role = "admin" if user_count == 0 else "coordinator"
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "role": role,
        "assigned_salons": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    token = create_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": UserResponse(**user).model_dump()
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or user["password"] != hash_password(credentials.password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    token = create_token(user["id"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**user).model_dump()
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# ============== USERS ROUTES (Admin only) ==============

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(admin: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.post("/users/assign-salons", response_model=dict)
async def assign_salons(request: AssignSalonsRequest, admin: dict = Depends(require_admin)):
    result = await db.users.update_one(
        {"id": request.coordinator_id},
        {"$set": {"assigned_salons": request.salon_ids}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Coordinador no encontrado")
    return {"message": "Salones asignados correctamente"}

@api_router.delete("/users/{user_id}", response_model=dict)
async def delete_user(user_id: str, admin: dict = Depends(require_admin)):
    if user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="No puedes eliminarte a ti mismo")
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"message": "Usuario eliminado"}

# ============== SALONS ROUTES ==============

@api_router.post("/salons", response_model=SalonResponse)
async def create_salon(salon_data: SalonCreate, admin: dict = Depends(require_admin)):
    salon = {
        "id": str(uuid.uuid4()),
        "name": salon_data.name,
        "address": salon_data.address or "",
        "city": salon_data.city or "Murcia",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.salons.insert_one(salon)
    return SalonResponse(**salon)

@api_router.get("/salons", response_model=List[SalonResponse])
async def get_salons(user: dict = Depends(get_current_user)):
    query = {}
    # If coordinator, only show assigned salons
    if user["role"] == "coordinator" and user.get("assigned_salons"):
        query = {"id": {"$in": user["assigned_salons"]}}
    
    salons = await db.salons.find(query, {"_id": 0}).to_list(1000)
    return [SalonResponse(**s) for s in salons]

@api_router.get("/salons/{salon_id}", response_model=SalonResponse)
async def get_salon(salon_id: str, user: dict = Depends(get_current_user)):
    salon = await db.salons.find_one({"id": salon_id}, {"_id": 0})
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    return SalonResponse(**salon)

@api_router.put("/salons/{salon_id}", response_model=SalonResponse)
async def update_salon(salon_id: str, salon_data: SalonUpdate, admin: dict = Depends(require_admin)):
    update_data = {k: v for k, v in salon_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.salons.find_one_and_update(
        {"id": salon_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    del result["_id"]
    return SalonResponse(**result)

@api_router.delete("/salons/{salon_id}", response_model=dict)
async def delete_salon(salon_id: str, admin: dict = Depends(require_admin)):
    result = await db.salons.delete_one({"id": salon_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    return {"message": "Salón eliminado"}

# ============== EMPLOYEES ROUTES ==============

@api_router.post("/employees", response_model=EmployeeResponse)
async def create_employee(employee_data: EmployeeCreate, user: dict = Depends(get_current_user)):
    # Verify salon exists
    salon = await db.salons.find_one({"id": employee_data.salon_id}, {"_id": 0})
    if not salon:
        raise HTTPException(status_code=404, detail="Salón no encontrado")
    
    employee = {
        "id": str(uuid.uuid4()),
        "name": employee_data.name,
        "salon_id": employee_data.salon_id,
        "level": employee_data.level,
        "notes": employee_data.notes or "",
        "trainings_count": 0,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.employees.insert_one(employee)
    employee["salon_name"] = salon["name"]
    return EmployeeResponse(**employee)

@api_router.get("/employees", response_model=List[EmployeeResponse])
async def get_employees(salon_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {}
    if salon_id:
        query["salon_id"] = salon_id
    elif user["role"] == "coordinator" and user.get("assigned_salons"):
        query["salon_id"] = {"$in": user["assigned_salons"]}
    
    employees = await db.employees.find(query, {"_id": 0}).to_list(1000)
    
    # Get salon names
    salon_ids = list(set(e["salon_id"] for e in employees))
    salons = await db.salons.find({"id": {"$in": salon_ids}}, {"_id": 0}).to_list(1000)
    salon_map = {s["id"]: s["name"] for s in salons}
    
    for emp in employees:
        emp["salon_name"] = salon_map.get(emp["salon_id"], "")
    
    return [EmployeeResponse(**e) for e in employees]

@api_router.get("/employees/{employee_id}", response_model=EmployeeResponse)
async def get_employee(employee_id: str, user: dict = Depends(get_current_user)):
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    salon = await db.salons.find_one({"id": employee["salon_id"]}, {"_id": 0})
    employee["salon_name"] = salon["name"] if salon else ""
    
    return EmployeeResponse(**employee)

@api_router.put("/employees/{employee_id}", response_model=EmployeeResponse)
async def update_employee(employee_id: str, employee_data: EmployeeUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in employee_data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No hay datos para actualizar")
    
    result = await db.employees.find_one_and_update(
        {"id": employee_id},
        {"$set": update_data},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    del result["_id"]
    
    salon = await db.salons.find_one({"id": result["salon_id"]}, {"_id": 0})
    result["salon_name"] = salon["name"] if salon else ""
    
    return EmployeeResponse(**result)

@api_router.delete("/employees/{employee_id}", response_model=dict)
async def delete_employee(employee_id: str, user: dict = Depends(get_current_user)):
    result = await db.employees.delete_one({"id": employee_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    return {"message": "Empleado eliminado"}

# ============== TRAINING TYPES ROUTES ==============

@api_router.post("/training-types", response_model=TrainingTypeResponse)
async def create_training_type(type_data: TrainingTypeCreate, admin: dict = Depends(require_admin)):
    training_type = {
        "id": str(uuid.uuid4()),
        "name": type_data.name,
        "description": type_data.description or "",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.training_types.insert_one(training_type)
    return TrainingTypeResponse(**training_type)

@api_router.get("/training-types", response_model=List[TrainingTypeResponse])
async def get_training_types(user: dict = Depends(get_current_user)):
    types = await db.training_types.find({}, {"_id": 0}).to_list(1000)
    return [TrainingTypeResponse(**t) for t in types]

@api_router.put("/training-types/{type_id}", response_model=TrainingTypeResponse)
async def update_training_type(type_id: str, type_data: TrainingTypeCreate, admin: dict = Depends(require_admin)):
    result = await db.training_types.find_one_and_update(
        {"id": type_id},
        {"$set": {"name": type_data.name, "description": type_data.description or ""}},
        return_document=True
    )
    if not result:
        raise HTTPException(status_code=404, detail="Tipo de formación no encontrado")
    del result["_id"]
    return TrainingTypeResponse(**result)

@api_router.delete("/training-types/{type_id}", response_model=dict)
async def delete_training_type(type_id: str, admin: dict = Depends(require_admin)):
    result = await db.training_types.delete_one({"id": type_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tipo de formación no encontrado")
    return {"message": "Tipo de formación eliminado"}

# ============== TRAININGS ROUTES ==============

@api_router.post("/trainings", response_model=TrainingResponse)
async def create_training(training_data: TrainingCreate, user: dict = Depends(get_current_user)):
    # Get employee
    employee = await db.employees.find_one({"id": training_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    # Get training type
    training_type = await db.training_types.find_one({"id": training_data.training_type_id}, {"_id": 0})
    if not training_type:
        raise HTTPException(status_code=404, detail="Tipo de formación no encontrado")
    
    level_before = employee["level"]
    level_after = training_data.level_after or level_before
    
    training = {
        "id": str(uuid.uuid4()),
        "employee_id": training_data.employee_id,
        "training_type_id": training_data.training_type_id,
        "coordinator_id": user["id"],
        "notes": training_data.notes or "",
        "level_before": level_before,
        "level_after": level_after,
        "date": datetime.now(timezone.utc).isoformat()
    }
    await db.trainings.insert_one(training)
    
    # Update employee level and training count
    await db.employees.update_one(
        {"id": training_data.employee_id},
        {"$set": {"level": level_after}, "$inc": {"trainings_count": 1}}
    )
    
    training["employee_name"] = employee["name"]
    training["training_type_name"] = training_type["name"]
    training["coordinator_name"] = user["name"]
    
    return TrainingResponse(**training)

@api_router.get("/trainings", response_model=List[TrainingResponse])
async def get_trainings(
    employee_id: Optional[str] = None,
    training_type_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    query = {}
    if employee_id:
        query["employee_id"] = employee_id
    if training_type_id:
        query["training_type_id"] = training_type_id
    
    trainings = await db.trainings.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Get related data
    emp_ids = list(set(t["employee_id"] for t in trainings))
    type_ids = list(set(t["training_type_id"] for t in trainings))
    coord_ids = list(set(t["coordinator_id"] for t in trainings))
    
    employees = await db.employees.find({"id": {"$in": emp_ids}}, {"_id": 0}).to_list(1000)
    types = await db.training_types.find({"id": {"$in": type_ids}}, {"_id": 0}).to_list(1000)
    coordinators = await db.users.find({"id": {"$in": coord_ids}}, {"_id": 0}).to_list(1000)
    
    emp_map = {e["id"]: e["name"] for e in employees}
    type_map = {t["id"]: t["name"] for t in types}
    coord_map = {c["id"]: c["name"] for c in coordinators}
    
    for t in trainings:
        t["employee_name"] = emp_map.get(t["employee_id"], "")
        t["training_type_name"] = type_map.get(t["training_type_id"], "")
        t["coordinator_name"] = coord_map.get(t["coordinator_id"], "")
    
    return [TrainingResponse(**t) for t in trainings]

@api_router.get("/trainings/employee/{employee_id}/history", response_model=List[TrainingResponse])
async def get_employee_training_history(employee_id: str, user: dict = Depends(get_current_user)):
    trainings = await db.trainings.find({"employee_id": employee_id}, {"_id": 0}).sort("date", -1).to_list(1000)
    
    employee = await db.employees.find_one({"id": employee_id}, {"_id": 0})
    types = await db.training_types.find({}, {"_id": 0}).to_list(1000)
    type_map = {t["id"]: t["name"] for t in types}
    
    for t in trainings:
        t["employee_name"] = employee["name"] if employee else ""
        t["training_type_name"] = type_map.get(t["training_type_id"], "")
        coordinator = await db.users.find_one({"id": t["coordinator_id"]}, {"_id": 0})
        t["coordinator_name"] = coordinator["name"] if coordinator else ""
    
    return [TrainingResponse(**t) for t in trainings]

# ============== SCHEDULED TRAININGS ROUTES ==============

@api_router.post("/scheduled-trainings", response_model=ScheduledTrainingResponse)
async def create_scheduled_training(
    training_data: ScheduledTrainingCreate,
    user: dict = Depends(get_current_user)
):
    employee = await db.employees.find_one({"id": training_data.employee_id}, {"_id": 0})
    if not employee:
        raise HTTPException(status_code=404, detail="Empleado no encontrado")
    
    training_type = await db.training_types.find_one({"id": training_data.training_type_id}, {"_id": 0})
    if not training_type:
        raise HTTPException(status_code=404, detail="Tipo de formación no encontrado")
    
    salon = await db.salons.find_one({"id": employee["salon_id"]}, {"_id": 0})
    
    scheduled = {
        "id": str(uuid.uuid4()),
        "employee_id": training_data.employee_id,
        "training_type_id": training_data.training_type_id,
        "coordinator_id": user["id"],
        "scheduled_date": training_data.scheduled_date,
        "notes": training_data.notes or "",
        "reminder_sent": False,
        "completed": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.scheduled_trainings.insert_one(scheduled)
    
    scheduled["employee_name"] = employee["name"]
    scheduled["training_type_name"] = training_type["name"]
    scheduled["salon_name"] = salon["name"] if salon else ""
    
    return ScheduledTrainingResponse(**scheduled)

@api_router.get("/scheduled-trainings", response_model=List[ScheduledTrainingResponse])
async def get_scheduled_trainings(
    upcoming_only: bool = False,
    user: dict = Depends(get_current_user)
):
    query = {}
    if upcoming_only:
        query["completed"] = False
        query["scheduled_date"] = {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}
    
    scheduled = await db.scheduled_trainings.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(1000)
    
    # Get related data
    emp_ids = list(set(s["employee_id"] for s in scheduled))
    type_ids = list(set(s["training_type_id"] for s in scheduled))
    
    employees = await db.employees.find({"id": {"$in": emp_ids}}, {"_id": 0}).to_list(1000)
    types = await db.training_types.find({"id": {"$in": type_ids}}, {"_id": 0}).to_list(1000)
    
    emp_map = {e["id"]: e for e in employees}
    type_map = {t["id"]: t["name"] for t in types}
    
    salon_ids = list(set(emp_map[e]["salon_id"] for e in emp_map if "salon_id" in emp_map.get(e, {})))
    salons = await db.salons.find({"id": {"$in": salon_ids}}, {"_id": 0}).to_list(1000)
    salon_map = {s["id"]: s["name"] for s in salons}
    
    for s in scheduled:
        emp = emp_map.get(s["employee_id"], {})
        s["employee_name"] = emp.get("name", "")
        s["training_type_name"] = type_map.get(s["training_type_id"], "")
        s["salon_name"] = salon_map.get(emp.get("salon_id", ""), "")
    
    return [ScheduledTrainingResponse(**s) for s in scheduled]

@api_router.put("/scheduled-trainings/{scheduled_id}/complete", response_model=dict)
async def complete_scheduled_training(scheduled_id: str, user: dict = Depends(get_current_user)):
    result = await db.scheduled_trainings.update_one(
        {"id": scheduled_id},
        {"$set": {"completed": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Formación programada no encontrada")
    return {"message": "Formación marcada como completada"}

@api_router.delete("/scheduled-trainings/{scheduled_id}", response_model=dict)
async def delete_scheduled_training(scheduled_id: str, user: dict = Depends(get_current_user)):
    result = await db.scheduled_trainings.delete_one({"id": scheduled_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Formación programada no encontrada")
    return {"message": "Formación programada eliminada"}

# ============== STATS/REPORTS ROUTES ==============

@api_router.get("/stats", response_model=StatsResponse)
async def get_stats(user: dict = Depends(get_current_user)):
    # Filter by assigned salons if coordinator
    salon_filter = {}
    if user["role"] == "coordinator" and user.get("assigned_salons"):
        salon_filter = {"salon_id": {"$in": user["assigned_salons"]}}
    
    total_employees = await db.employees.count_documents(salon_filter)
    
    # Get employee IDs for training filter
    if salon_filter:
        employees = await db.employees.find(salon_filter, {"id": 1, "_id": 0}).to_list(10000)
        emp_ids = [e["id"] for e in employees]
        training_filter = {"employee_id": {"$in": emp_ids}}
    else:
        training_filter = {}
    
    total_trainings = await db.trainings.count_documents(training_filter)
    
    # Trainings this month
    start_of_month = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_filter = {**training_filter, "date": {"$gte": start_of_month.isoformat()}}
    trainings_this_month = await db.trainings.count_documents(month_filter)
    
    # Employees by level
    pipeline = [
        {"$match": salon_filter} if salon_filter else {"$match": {}},
        {"$group": {"_id": "$level", "count": {"$sum": 1}}}
    ]
    level_results = await db.employees.aggregate(pipeline).to_list(100)
    employees_by_level = {r["_id"]: r["count"] for r in level_results}
    
    # Trainings by type
    type_pipeline = [
        {"$match": training_filter} if training_filter else {"$match": {}},
        {"$group": {"_id": "$training_type_id", "count": {"$sum": 1}}}
    ]
    type_results = await db.trainings.aggregate(type_pipeline).to_list(100)
    
    # Get type names
    type_ids = [r["_id"] for r in type_results]
    types = await db.training_types.find({"id": {"$in": type_ids}}, {"_id": 0}).to_list(100)
    type_map = {t["id"]: t["name"] for t in types}
    trainings_by_type = {type_map.get(r["_id"], "Desconocido"): r["count"] for r in type_results}
    
    # Upcoming trainings
    upcoming_filter = {"completed": False, "scheduled_date": {"$gte": datetime.now(timezone.utc).strftime("%Y-%m-%d")}}
    upcoming_trainings = await db.scheduled_trainings.count_documents(upcoming_filter)
    
    return StatsResponse(
        total_employees=total_employees,
        total_trainings=total_trainings,
        trainings_this_month=trainings_this_month,
        employees_by_level=employees_by_level,
        trainings_by_type=trainings_by_type,
        upcoming_trainings=upcoming_trainings
    )

@api_router.get("/reports/monthly", response_model=dict)
async def get_monthly_report(year: int = None, month: int = None, user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    year = year or now.year
    month = month or now.month
    
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    trainings = await db.trainings.find({
        "date": {"$gte": start_date.isoformat(), "$lt": end_date.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Group by day
    daily_counts = {}
    for t in trainings:
        day = t["date"][:10]
        daily_counts[day] = daily_counts.get(day, 0) + 1
    
    return {
        "year": year,
        "month": month,
        "total_trainings": len(trainings),
        "daily_breakdown": daily_counts
    }

# ============== SEND REMINDERS (Background task) ==============

@api_router.post("/send-reminders", response_model=dict)
async def send_reminders(background_tasks: BackgroundTasks, admin: dict = Depends(require_admin)):
    """Send reminder emails for trainings scheduled for tomorrow"""
    tomorrow = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%d")
    
    scheduled = await db.scheduled_trainings.find({
        "scheduled_date": tomorrow,
        "reminder_sent": False,
        "completed": False
    }, {"_id": 0}).to_list(1000)
    
    sent_count = 0
    for s in scheduled:
        # Get coordinator email
        coordinator = await db.users.find_one({"id": s["coordinator_id"]}, {"_id": 0})
        if not coordinator:
            continue
        
        employee = await db.employees.find_one({"id": s["employee_id"]}, {"_id": 0})
        training_type = await db.training_types.find_one({"id": s["training_type_id"]}, {"_id": 0})
        salon = await db.salons.find_one({"id": employee.get("salon_id", "")}, {"_id": 0}) if employee else None
        
        if employee and training_type:
            background_tasks.add_task(
                send_reminder_email,
                coordinator["email"],
                employee["name"],
                training_type["name"],
                s["scheduled_date"],
                salon["name"] if salon else "N/A"
            )
            
            # Mark as sent
            await db.scheduled_trainings.update_one(
                {"id": s["id"]},
                {"$set": {"reminder_sent": True}}
            )
            sent_count += 1
    
    return {"message": f"Se enviaron {sent_count} recordatorios"}

# ============== HEALTH CHECK ==============

@api_router.get("/")
async def root():
    return {"message": "API de Formación Salones", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "formacion-salones-api"}

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
