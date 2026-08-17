"""
Supabase client service & data repository.

Connects to Supabase PostgreSQL database when SUPABASE_URL and SUPABASE_KEY are provided.
Provides a resilient local storage fallback when Supabase is not yet configured, ensuring
seamless developer experience and immediate out-of-the-box functionality.
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load .env file from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "../../../.env"))

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))

try:
    from supabase import create_client, Client
    HAS_SUPABASE_LIB = True
except ImportError:
    HAS_SUPABASE_LIB = False


class InMemoryStore:
    """In-memory data store with default demo data."""
    def __init__(self):
        self.users: Dict[str, Dict[str, Any]] = {}
        self.student_details: Dict[str, Dict[str, Any]] = {}
        self.predictions: List[Dict[str, Any]] = []
        self.interventions: List[Dict[str, Any]] = []


_in_memory_store = InMemoryStore()


class DatabaseService:
    _instance = None

    def __init__(self):
        self.client: Optional[Any] = None
        self.is_supabase_connected = False

        if HAS_SUPABASE_LIB and SUPABASE_URL and SUPABASE_KEY and "your-supabase-url" not in SUPABASE_URL:
            try:
                self.client = create_client(SUPABASE_URL, SUPABASE_KEY)
                self.is_supabase_connected = True
                print("Connected successfully to Supabase PostgreSQL database.")
            except Exception as e:
                print(f"Failed to connect to Supabase: {e}. Falling back to in-memory store.")
                self.client = None
                self.is_supabase_connected = False
        else:
            print("Supabase credentials not set or placeholder detected. Operating in local in-memory mode.")

    # --- Users & Auth CRUD -----------------------------------------------------

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user (student, mentor, admin)."""
        now_iso = datetime.now(timezone.utc).isoformat()
        user_record = {
            "id": user_data.get("id") or str(uuid.uuid4()),
            "email": user_data["email"].lower().strip(),
            "password_hash": user_data["password_hash"],
            "full_name": user_data["full_name"],
            "student_id": user_data.get("student_id"),
            "role": user_data.get("role", "student"),
            "created_at": now_iso
        }

        if self.is_supabase_connected:
            try:
                res = self.client.table("users").insert(user_record).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase create_user error: {e}")
                # Fallback to local store
                pass

        _in_memory_store.users[user_record["email"]] = user_record
        return user_record

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve user record by email."""
        clean_email = email.lower().strip()
        if self.is_supabase_connected:
            try:
                res = self.client.table("users").select("*").eq("email", clean_email).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase get_user_by_email error: {e}")

        return _in_memory_store.users.get(clean_email)

    def get_user_by_student_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user record by student_id."""
        clean_id = student_id.strip()
        if self.is_supabase_connected:
            try:
                res = self.client.table("users").select("*").eq("student_id", clean_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase get_user_by_student_id error: {e}")

        for user in _in_memory_store.users.values():
            if user.get("student_id") == clean_id:
                return user
        return None

    # --- Student Details (Dataset Features) ------------------------------------

    def save_student_details(self, student_id: str, features: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update student details (UCI dataset features)."""
        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "student_id": student_id,
            **features,
            "updated_at": now_iso
        }

        if self.is_supabase_connected:
            try:
                res = self.client.table("student_details").upsert(record).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase save_student_details error: {e}")

        _in_memory_store.student_details[student_id] = record
        return record

    def get_student_details(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Fetch saved features/details for a student."""
        if self.is_supabase_connected:
            try:
                res = self.client.table("student_details").select("*").eq("student_id", student_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase get_student_details error: {e}")

        return _in_memory_store.student_details.get(student_id)

    # --- Predictions & Logs ---------------------------------------------------

    def save_prediction(self, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a prediction result with SHAP reasons and recommendations."""
        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "id": prediction_data.get("id") or str(uuid.uuid4()),
            "student_id": prediction_data["student_id"],
            "risk_score": float(prediction_data["risk_score"]),
            "risk_band": prediction_data["risk_band"],
            "flagged": bool(prediction_data["flagged"]),
            "top_reasons": prediction_data.get("top_reasons", []),
            "recommendations": prediction_data.get("recommendations", []),
            "features_snapshot": prediction_data.get("features_snapshot", {}),
            "created_at": now_iso
        }

        if self.is_supabase_connected:
            try:
                res = self.client.table("predictions").insert(record).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase save_prediction error: {e}")

        _in_memory_store.predictions.append(record)
        return record

    def get_predictions_by_student(self, student_id: str) -> List[Dict[str, Any]]:
        """Get history of predictions for a student, newest first."""
        if self.is_supabase_connected:
            try:
                res = self.client.table("predictions").select("*").eq("student_id", student_id).order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                print(f"Supabase get_predictions_by_student error: {e}")

        preds = [p for p in _in_memory_store.predictions if p["student_id"] == student_id]
        preds.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return preds

    def get_all_predictions(self) -> List[Dict[str, Any]]:
        """Get all predictions logged across the system."""
        if self.is_supabase_connected:
            try:
                res = self.client.table("predictions").select("*").order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                print(f"Supabase get_all_predictions error: {e}")

        preds = list(_in_memory_store.predictions)
        preds.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return preds

    def get_students_summary_list(self) -> List[Dict[str, Any]]:
        """List distinct students with their latest risk status and profile."""
        all_preds = self.get_all_predictions()
        
        # Group by student_id to get latest prediction
        latest_pred_map: Dict[str, Dict[str, Any]] = {}
        for p in all_preds:
            sid = p["student_id"]
            if sid not in latest_pred_map:
                latest_pred_map[sid] = p

        # Merge with user accounts & student details
        student_records = []
        # Check all registered student users
        seen_sids = set()

        if self.is_supabase_connected:
            try:
                res = self.client.table("users").select("*").eq("role", "student").execute()
                users = res.data or []
            except Exception:
                users = [u for u in _in_memory_store.users.values() if u.get("role") == "student"]
        else:
            users = [u for u in _in_memory_store.users.values() if u.get("role") == "student"]

        for u in users:
            sid = u.get("student_id") or u.get("id")
            seen_sids.add(sid)
            latest = latest_pred_map.get(sid, {})
            student_records.append({
                "student_id": sid,
                "full_name": u.get("full_name", "Student"),
                "email": u.get("email", ""),
                "risk_score": latest.get("risk_score"),
                "risk_band": latest.get("risk_band", "unassessed"),
                "flagged": latest.get("flagged", False),
                "last_evaluated": latest.get("created_at"),
                "has_details": self.get_student_details(sid) is not None
            })

        # Add any students that have predictions but weren't in user table
        for sid, latest in latest_pred_map.items():
            if sid not in seen_sids:
                student_records.append({
                    "student_id": sid,
                    "full_name": f"Student {sid}",
                    "email": f"{sid.lower()}@campus.edu",
                    "risk_score": latest.get("risk_score"),
                    "risk_band": latest.get("risk_band", "unassessed"),
                    "flagged": latest.get("flagged", False),
                    "last_evaluated": latest.get("created_at"),
                    "has_details": self.get_student_details(sid) is not None
                })
                seen_sids.add(sid)

        return student_records

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Aggregate summary counts of students by risk levels."""
        students = self.get_students_summary_list()
        
        high_risk = sum(1 for s in students if s.get("risk_band") == "high")
        medium_risk = sum(1 for s in students if s.get("risk_band") == "medium")
        low_risk = sum(1 for s in students if s.get("risk_band") == "low")
        unassessed = sum(1 for s in students if s.get("risk_band") == "unassessed")
        flagged = sum(1 for s in students if s.get("flagged") is True)

        all_preds = self.get_all_predictions()
        avg_score = round(sum(p["risk_score"] for p in all_preds) / len(all_preds), 4) if all_preds else 0.0

        return {
            "total_students": len(students),
            "high_risk_count": high_risk,
            "medium_risk_count": medium_risk,
            "low_risk_count": low_risk,
            "unassessed_count": unassessed,
            "flagged_count": flagged,
            "average_risk_score": avg_score,
            "total_assessments": len(all_preds),
            "database_connected": self.is_supabase_connected
        }

    # --- Interventions ---------------------------------------------------------

    def create_intervention(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record an intervention for an at-risk student."""
        now_iso = datetime.now(timezone.utc).isoformat()
        record = {
            "id": data.get("id") or str(uuid.uuid4()),
            "student_id": data["student_id"],
            "mentor_name": data.get("mentor_name", "Academic Mentor"),
            "type": data.get("type", "Academic Advising"),
            "notes": data.get("notes", ""),
            "status": data.get("status", "Open"),
            "created_at": now_iso,
            "updated_at": now_iso
        }

        if self.is_supabase_connected:
            try:
                res = self.client.table("interventions").insert(record).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase create_intervention error: {e}")

        _in_memory_store.interventions.append(record)
        return record

    def get_interventions(self, student_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch interventions, optionally filtered by student_id."""
        if self.is_supabase_connected:
            try:
                query = self.client.table("interventions").select("*")
                if student_id:
                    query = query.eq("student_id", student_id)
                res = query.order("created_at", desc=True).execute()
                if res.data is not None:
                    return res.data
            except Exception as e:
                print(f"Supabase get_interventions error: {e}")

        if student_id:
            items = [i for i in _in_memory_store.interventions if i["student_id"] == student_id]
        else:
            items = list(_in_memory_store.interventions)
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items

    def update_intervention(self, intervention_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update intervention status or notes."""
        now_iso = datetime.now(timezone.utc).isoformat()
        updates["updated_at"] = now_iso

        if self.is_supabase_connected:
            try:
                res = self.client.table("interventions").update(updates).eq("id", intervention_id).execute()
                if res.data and len(res.data) > 0:
                    return res.data[0]
            except Exception as e:
                print(f"Supabase update_intervention error: {e}")

        for i in _in_memory_store.interventions:
            if i["id"] == intervention_id:
                i.update(updates)
                return i
        return None


# Global singleton instance
db_service = DatabaseService()
