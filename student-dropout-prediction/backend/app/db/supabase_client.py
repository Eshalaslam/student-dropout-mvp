"""
PostgreSQL client service & data repository (Aiven).

Connects to a PostgreSQL database when DATABASE_URL is provided.
Provides a resilient local storage fallback when the database is unreachable,
ensuring seamless developer experience and immediate out-of-the-box functionality.
"""
import os
import uuid
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load .env file from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

DATABASE_URL = os.getenv("DATABASE_URL", "")

try:
    import psycopg2
    from psycopg2 import pool
    from psycopg2.extras import RealDictCursor, Json
    HAS_PSYCOPG2 = True
except ImportError:
    HAS_PSYCOPG2 = False


class InMemoryStore:
    """In-memory data store with default demo data."""
    def __init__(self):
        self.users: Dict[str, Dict[str, Any]] = {}
        self.student_details: Dict[str, Dict[str, Any]] = {}
        self.predictions: List[Dict[str, Any]] = []
        self.interventions: List[Dict[str, Any]] = []
        # New tables
        self.mentors: Dict[str, Dict[str, Any]] = {}  # keyed by mentor_id
        self.mentor_assignments: List[Dict[str, Any]] = []
        self.mentor_notes: List[Dict[str, Any]] = []
        self.intervention_notes: List[Dict[str, Any]] = []
        self.reports: List[Dict[str, Any]] = []
        self.report_schedules: List[Dict[str, Any]] = []
        self.access_logs: List[Dict[str, Any]] = []
        self.privacy_docs: List[Dict[str, Any]] = []
        self.fairness_results: List[Dict[str, Any]] = []
        self.feature_influences: List[Dict[str, Any]] = []


_in_memory_store = InMemoryStore()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _dictify(row) -> Optional[Dict[str, Any]]:
    """Convert a RealDictRow to a plain dict, or return None."""
    return dict(row) if row is not None else None


class DatabaseService:
    _instance = None

    def __init__(self):
        self._pool = None
        self.is_supabase_connected = False  # kept as-is for backward compat in templates

        if HAS_PSYCOPG2 and DATABASE_URL:
            try:
                self._pool = pool.ThreadedConnectionPool(
                    minconn=1,
                    maxconn=5,
                    dsn=DATABASE_URL,
                )
                # Verify connectivity and create tables
                self._init_schema()
                self.is_supabase_connected = True
                print("Connected successfully to PostgreSQL database (Aiven).")
            except Exception as e:
                print(f"Failed to connect to PostgreSQL: {e}. Falling back to in-memory store.")
                self._pool = None
                self.is_supabase_connected = False
        else:
            print("DATABASE_URL not set or psycopg2 not installed. Operating in local in-memory mode.")

    # =========================================================================
    # INTERNAL HELPERS
    # =========================================================================

    def _init_schema(self):
        """Run schema.sql to create tables if they don't exist."""
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        if not os.path.exists(schema_path):
            print(f"schema.sql not found at {schema_path}, skipping table creation.")
            return
        with open(schema_path, "r") as f:
            sql = f.read()
        conn = self._pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute(sql)
            conn.commit()
            cur.close()
            print("Database schema initialized successfully.")
        except Exception as e:
            conn.rollback()
            print(f"Schema initialization warning (tables may already exist): {e}")
        finally:
            self._pool.putconn(conn)

    def _query(self, sql: str, params=None) -> List[Dict[str, Any]]:
        """Execute a SELECT query and return list of dicts."""
        conn = self._pool.getconn()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params or ())
            rows = cur.fetchall()
            cur.close()
            return [dict(r) for r in rows]
        finally:
            self._pool.putconn(conn)

    def _query_one(self, sql: str, params=None) -> Optional[Dict[str, Any]]:
        """Execute a SELECT query and return first row as dict."""
        rows = self._query(sql, params)
        return rows[0] if rows else None

    def _execute(self, sql: str, params=None) -> int:
        """Execute INSERT/UPDATE/DELETE and return affected row count."""
        conn = self._pool.getconn()
        try:
            cur = conn.cursor()
            cur.execute(sql, params or ())
            conn.commit()
            affected = cur.rowcount
            cur.close()
            return affected
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    def _execute_returning(self, sql: str, params=None) -> Optional[Dict[str, Any]]:
        """Execute INSERT/UPDATE...RETURNING and return the row as dict."""
        conn = self._pool.getconn()
        try:
            cur = conn.cursor(cursor_factory=RealDictCursor)
            cur.execute(sql, params or ())
            row = cur.fetchone()
            conn.commit()
            cur.close()
            return dict(row) if row else None
        except Exception:
            conn.rollback()
            raise
        finally:
            self._pool.putconn(conn)

    # =========================================================================
    # USERS & AUTH CRUD
    # =========================================================================

    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user (student, mentor, admin)."""
        now_iso = _now_iso()
        user_record = {
            "id": user_data.get("id") or str(uuid.uuid4()),
            "email": user_data["email"].lower().strip(),
            "password_hash": user_data["password_hash"],
            "full_name": user_data["full_name"],
            "student_id": user_data.get("student_id"),
            "role": user_data.get("role", "student"),
            "username": user_data.get("username"),
            "mentor_id": user_data.get("mentor_id"),
            "mentor_name": user_data.get("mentor_name"),
            "status": user_data.get("status", "Active"),
            "created_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO users (id, email, password_hash, full_name, student_id,
                       role, username, mentor_id, mentor_name, status, created_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                       ON CONFLICT (id) DO NOTHING
                       RETURNING *""",
                    (user_record["id"], user_record["email"], user_record["password_hash"],
                     user_record["full_name"], user_record["student_id"], user_record["role"],
                     user_record["username"], user_record["mentor_id"], user_record["mentor_name"],
                     user_record["status"], user_record["created_at"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB create_user error: {e}")

        _in_memory_store.users[user_record["email"]] = user_record
        return user_record

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Retrieve user record by email."""
        clean_email = email.lower().strip()
        if self.is_supabase_connected:
            try:
                row = self._query_one("SELECT * FROM users WHERE email = %s", (clean_email,))
                if row:
                    return row
            except Exception as e:
                print(f"DB get_user_by_email error: {e}")

        return _in_memory_store.users.get(clean_email)

    def get_user_by_student_id(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve user record by student_id."""
        clean_id = student_id.strip()
        if self.is_supabase_connected:
            try:
                row = self._query_one("SELECT * FROM users WHERE student_id = %s", (clean_id,))
                if row:
                    return row
            except Exception as e:
                print(f"DB get_user_by_student_id error: {e}")

        for user in _in_memory_store.users.values():
            if user.get("student_id") == clean_id:
                return user
        return None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Retrieve user record by username."""
        clean_name = username.strip()
        if self.is_supabase_connected:
            try:
                row = self._query_one("SELECT * FROM users WHERE username = %s", (clean_name,))
                if row:
                    return row
            except Exception as e:
                print(f"DB get_user_by_username error: {e}")

        for user in _in_memory_store.users.values():
            if user.get("username") == clean_name:
                return user
        return None

    def get_all_users(self) -> List[Dict[str, Any]]:
        """Get all user records."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM users")
            except Exception as e:
                print(f"DB get_all_users error: {e}")

        return list(_in_memory_store.users.values())

    # =========================================================================
    # STUDENT DETAILS (Dataset Features)
    # =========================================================================

    def save_student_details(self, student_id: str, features: Dict[str, Any]) -> Dict[str, Any]:
        """Save or update student details (UCI dataset features)."""
        now_iso = _now_iso()
        record = {
            "student_id": student_id,
            **features,
            "updated_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                # Upsert: insert or update on student_id conflict
                cols = list(record.keys())
                vals = [record[c] for c in cols]
                placeholders = ", ".join(["%s"] * len(cols))
                col_names = ", ".join(cols)
                update_clause = ", ".join([f"{c} = EXCLUDED.{c}" for c in cols if c != "student_id"])
                row = self._execute_returning(
                    f"INSERT INTO student_details ({col_names}) VALUES ({placeholders}) "
                    f"ON CONFLICT (student_id) DO UPDATE SET {update_clause} RETURNING *",
                    vals,
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB save_student_details error: {e}")

        _in_memory_store.student_details[student_id] = record
        return record

    def get_student_details(self, student_id: str) -> Optional[Dict[str, Any]]:
        """Fetch saved features/details for a student."""
        if self.is_supabase_connected:
            try:
                row = self._query_one("SELECT * FROM student_details WHERE student_id = %s", (student_id,))
                if row:
                    return row
            except Exception as e:
                print(f"DB get_student_details error: {e}")

        return _in_memory_store.student_details.get(student_id)

    def get_all_student_details(self) -> List[Dict[str, Any]]:
        """Fetch all student details."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM student_details")
            except Exception as e:
                print(f"DB get_all_student_details error: {e}")

        return list(_in_memory_store.student_details.values())

    def get_all_student_users_bulk(self) -> Dict[str, Dict[str, Any]]:
        """Fetch ALL users with a student_id in ONE query and return as {student_id: user} dict.
        Eliminates N calls to get_user_by_student_id inside per-student loops."""
        if self.is_supabase_connected:
            try:
                rows = self._query(
                    "SELECT * FROM users WHERE student_id IS NOT NULL AND student_id != ''"
                )
                return {r["student_id"]: r for r in rows if r.get("student_id")}
            except Exception as e:
                print(f"DB get_all_student_users_bulk error: {e}")

        return {
            u["student_id"]: u
            for u in _in_memory_store.users.values()
            if u.get("student_id")
        }

    def get_all_interventions_bulk(self) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch ALL intervention rows in ONE query, grouped by student_id.
        Eliminates N calls to get_interventions(student_id) inside per-student loops."""
        if self.is_supabase_connected:
            try:
                rows = self._query(
                    "SELECT * FROM interventions ORDER BY created_at DESC"
                )
                result: Dict[str, List] = {}
                for r in rows:
                    sid = r.get("student_id", "")
                    if sid:
                        result.setdefault(sid, []).append(r)
                return result
            except Exception as e:
                print(f"DB get_all_interventions_bulk error: {e}")

        # In-memory fallback
        result: Dict[str, List] = {}
        for iv in sorted(
            _in_memory_store.interventions,
            key=lambda x: x.get("created_at", ""),
            reverse=True,
        ):
            sid = iv.get("student_id", "")
            if sid:
                result.setdefault(sid, []).append(iv)
        return result

    def get_all_mentor_notes_bulk(self) -> Dict[str, List[Dict[str, Any]]]:
        """Fetch ALL mentor_notes rows in ONE query, grouped by student_id.
        Eliminates N calls to get_notes_by_student inside per-student loops."""
        if self.is_supabase_connected:
            try:
                rows = self._query(
                    "SELECT * FROM mentor_notes ORDER BY timestamp DESC"
                )
                result: Dict[str, List] = {}
                for r in rows:
                    sid = r.get("student_id", "")
                    if sid:
                        result.setdefault(sid, []).append(r)
                return result
            except Exception as e:
                print(f"DB get_all_mentor_notes_bulk error: {e}")

        result: Dict[str, List] = {}
        for n in sorted(
            _in_memory_store.mentor_notes,
            key=lambda x: x.get("timestamp", ""),
            reverse=True,
        ):
            sid = n.get("student_id", "")
            if sid:
                result.setdefault(sid, []).append(n)
        return result

    def get_all_mentor_assignments_bulk(self) -> Dict[str, Dict[str, Any]]:
        """Fetch ALL mentor_assignments rows in ONE query, keyed by student_id.
        Eliminates N calls to get_mentors_by_student inside per-student loops."""
        if self.is_supabase_connected:
            try:
                rows = self._query(
                    "SELECT ma.student_id, m.mentor_id, m.name as mentor_name "
                    "FROM mentor_assignments ma "
                    "JOIN mentors m ON ma.mentor_id = m.mentor_id"
                )
                return {r["student_id"]: r for r in rows if r.get("student_id")}
            except Exception as e:
                print(f"DB get_all_mentor_assignments_bulk error: {e}")

        result = {}
        for a in _in_memory_store.mentor_assignments:
            sid = a.get("student_id")
            if sid and sid not in result:
                result[sid] = a
        return result


    def save_prediction(self, prediction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a prediction result with SHAP reasons and recommendations."""
        now_iso = _now_iso()
        record = {
            "id": prediction_data.get("id") or str(uuid.uuid4()),
            "student_id": prediction_data["student_id"],
            "risk_score": float(prediction_data["risk_score"]),
            "risk_band": prediction_data["risk_band"],
            "flagged": bool(prediction_data["flagged"]),
            "top_reasons": prediction_data.get("top_reasons", []),
            "recommendations": prediction_data.get("recommendations", []),
            "features_snapshot": prediction_data.get("features_snapshot", {}),
            "created_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO predictions (id, student_id, risk_score, risk_band,
                       flagged, top_reasons, recommendations, features_snapshot, created_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["student_id"], record["risk_score"],
                     record["risk_band"], record["flagged"],
                     Json(record["top_reasons"]), Json(record["recommendations"]),
                     Json(record["features_snapshot"]), record["created_at"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB save_prediction error: {e}")

        _in_memory_store.predictions.append(record)
        return record

    def get_predictions_by_student(self, student_id: str) -> List[Dict[str, Any]]:
        """Get history of predictions for a student, newest first."""
        if self.is_supabase_connected:
            try:
                return self._query(
                    "SELECT * FROM predictions WHERE student_id = %s ORDER BY created_at DESC",
                    (student_id,),
                )
            except Exception as e:
                print(f"DB get_predictions_by_student error: {e}")

        preds = [p for p in _in_memory_store.predictions if p["student_id"] == student_id]
        preds.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return preds

    def get_all_predictions(self) -> List[Dict[str, Any]]:
        """Get all predictions logged across the system."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM predictions ORDER BY created_at DESC")
            except Exception as e:
                print(f"DB get_all_predictions error: {e}")

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

        student_records: List[Dict[str, Any]] = []
        seen_sids: set = set()

        if self.is_supabase_connected:
            try:
                users = self._query("SELECT * FROM users WHERE role = %s", ("student",))
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
                "has_details": self.get_student_details(sid) is not None,
            })

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
                    "has_details": self.get_student_details(sid) is not None,
                })
                seen_sids.add(sid)

        return student_records

    # =========================================================================
    # DASHBOARD AGGREGATES
    # =========================================================================

    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Aggregate summary counts of students by risk levels."""
        students = self.get_students_summary_list()

        high_risk = sum(1 for s in students if s.get("risk_band") == "high")
        medium_risk = sum(1 for s in students if s.get("risk_band") == "medium")
        low_risk = sum(1 for s in students if s.get("risk_band") == "low")
        unassessed = sum(1 for s in students if s.get("risk_band") == "unassessed")
        flagged = sum(1 for s in students if s.get("flagged") is True)

        all_preds = self.get_all_predictions()
        avg_score = (
            round(sum(p["risk_score"] for p in all_preds) / len(all_preds), 4)
            if all_preds
            else 0.0
        )

        return {
            "total_students": len(students),
            "high_risk_count": high_risk,
            "medium_risk_count": medium_risk,
            "low_risk_count": low_risk,
            "unassessed_count": unassessed,
            "flagged_count": flagged,
            "average_risk_score": avg_score,
            "total_assessments": len(all_preds),
            "database_connected": self.is_supabase_connected,
        }

    def get_risk_distribution(self) -> Dict[str, int]:
        """Get counts of students by risk band."""
        students = self.get_students_summary_list()
        high = sum(1 for s in students if s.get("risk_band") == "high")
        medium = sum(1 for s in students if s.get("risk_band") == "medium")
        low = sum(1 for s in students if s.get("risk_band") == "low")
        return {"high": high, "medium": medium, "low": low}

    def get_department_breakdown(self) -> List[Dict[str, Any]]:
        """Get average risk percentage per department."""
        details = self.get_all_student_details()
        dept_data: Dict[str, List[float]] = {}
        for d in details:
            dept = d.get("department", "Unknown")
            if dept not in dept_data:
                dept_data[dept] = []
            sem1_approved = d.get("units_approved_sem1", 0)
            sem1_enrolled = d.get("units_enrolled_sem1", 1)
            sem2_approved = d.get("units_approved_sem2", 0)
            sem2_enrolled = d.get("units_enrolled_sem2", 1)
            total = sem1_enrolled + sem2_enrolled
            approved = sem1_approved + sem2_approved
            rate = (approved / total * 100) if total > 0 else 0.0
            risk_pct = 100.0 - rate
            dept_data[dept].append(risk_pct)

        result = []
        for dept, percentages in sorted(dept_data.items()):
            avg = round(sum(percentages) / len(percentages), 1) if percentages else 0.0
            result.append({"department": dept, "average_risk_percentage": avg})
        return result

    def get_top_risk_drivers(self) -> List[Dict[str, Any]]:
        """Get top risk factors from all SHAP predictions."""
        all_preds = self.get_all_predictions()
        factor_counts: Dict[str, int] = {}
        for pred in all_preds:
            reasons = pred.get("top_reasons", [])
            if isinstance(reasons, str):
                try:
                    reasons = json.loads(reasons)
                except Exception:
                    reasons = []
            for r in reasons:
                cat = r.get("category", "risk")
                if cat == "risk":
                    feat = r.get("feature", "unknown")
                    factor_counts[feat] = factor_counts.get(feat, 0) + 1

        sorted_factors = sorted(factor_counts.items(), key=lambda x: x[1], reverse=True)
        return [{"factor": f, "count": c} for f, c in sorted_factors[:10]]

    def get_priority_outreach(self) -> List[Dict[str, Any]]:
        """Get high-risk students sorted by highest dropout_probability."""
        students = self.get_students_summary_list()
        high_risk = [s for s in students if s.get("risk_band") == "high"]
        high_risk.sort(key=lambda x: x.get("risk_score", 0), reverse=True)
        return high_risk[:20]

    # =========================================================================
    # INTERVENTIONS
    # =========================================================================

    def create_intervention(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Record an intervention for an at-risk student."""
        now_iso = _now_iso()
        record = {
            "id": data.get("id") or str(uuid.uuid4()),
            "student_id": data["student_id"],
            "mentor_name": data.get("mentor_name", "Academic Mentor"),
            "type": data.get("type", "Academic Advising"),
            "notes": data.get("notes", ""),
            "status": data.get("status", "Open"),
            "intervention_status": data.get("intervention_status", "Not Started"),
            "assigned_mentor": data.get("assigned_mentor"),
            "last_updated": data.get("last_updated"),
            "created_at": now_iso,
            "updated_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO interventions (id, student_id, mentor_name, type, notes,
                       status, intervention_status, assigned_mentor, last_updated,
                       created_at, updated_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["student_id"], record["mentor_name"],
                     record["type"], record["notes"], record["status"],
                     record["intervention_status"], record["assigned_mentor"],
                     record["last_updated"], record["created_at"], record["updated_at"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB create_intervention error: {e}")

        _in_memory_store.interventions.append(record)
        return record

    def get_interventions(self, student_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch interventions, optionally filtered by student_id."""
        if self.is_supabase_connected:
            try:
                if student_id:
                    return self._query(
                        "SELECT * FROM interventions WHERE student_id = %s ORDER BY created_at DESC",
                        (student_id,),
                    )
                else:
                    return self._query("SELECT * FROM interventions ORDER BY created_at DESC")
            except Exception as e:
                print(f"DB get_interventions error: {e}")

        if student_id:
            items = [i for i in _in_memory_store.interventions if i["student_id"] == student_id]
        else:
            items = list(_in_memory_store.interventions)
        items.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return items

    def update_intervention(self, intervention_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update intervention status or notes."""
        now_iso = _now_iso()
        updates["updated_at"] = now_iso

        if self.is_supabase_connected:
            try:
                set_parts = []
                set_vals = []
                for k, v in updates.items():
                    set_parts.append(f"{k} = %s")
                    set_vals.append(v)
                set_clause = ", ".join(set_parts)
                set_vals.append(intervention_id)
                row = self._execute_returning(
                    f"UPDATE interventions SET {set_clause} WHERE id = %s RETURNING *",
                    tuple(set_vals),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB update_intervention error: {e}")

        for i in _in_memory_store.interventions:
            if i["id"] == intervention_id:
                i.update(updates)
                return i
        return None

    def update_intervention_by_student(self, student_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update intervention record by student_id (finds the latest)."""
        now_iso = _now_iso()
        updates["updated_at"] = now_iso
        updates["last_updated"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        if self.is_supabase_connected:
            try:
                set_parts = []
                set_vals = []
                for k, v in updates.items():
                    set_parts.append(f"{k} = %s")
                    set_vals.append(v)
                set_clause = ", ".join(set_parts)
                set_vals.append(student_id)
                row = self._execute_returning(
                    f"UPDATE interventions SET {set_clause} WHERE student_id = %s "
                    f"AND id = (SELECT id FROM interventions WHERE student_id = %s "
                    f"ORDER BY created_at DESC LIMIT 1) RETURNING *",
                    tuple(set_vals),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB update_intervention_by_student error: {e}")

        for i in reversed(_in_memory_store.interventions):
            if i["student_id"] == student_id:
                i.update(updates)
                return i
        return None

    # =========================================================================
    # MENTORS
    # =========================================================================

    def create_mentor(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new mentor profile."""
        now_iso = _now_iso()
        record = {
            "id": data.get("id") or str(uuid.uuid4()),
            "username": data["username"],
            "password_hash": data["password_hash"],
            "name": data["name"],
            "email": data.get("email"),
            "role": data.get("role", "Mentor"),
            "mentor_id": data.get("mentor_id") or f"MNT-{str(uuid.uuid4())[:8].upper()}",
            "status": data.get("status", "Active"),
            "created_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO mentors (id, username, password_hash, name, email,
                       role, mentor_id, status, created_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["username"], record["password_hash"],
                     record["name"], record["email"], record["role"],
                     record["mentor_id"], record["status"], record["created_at"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB create_mentor error: {e}")

        _in_memory_store.mentors[record["mentor_id"]] = record
        return record

    def get_all_mentors(self) -> List[Dict[str, Any]]:
        """Get all mentor profiles."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM mentors")
            except Exception as e:
                print(f"DB get_all_mentors error: {e}")

        return list(_in_memory_store.mentors.values())

    def get_mentor_by_id(self, mentor_id: str) -> Optional[Dict[str, Any]]:
        """Get a mentor by mentor_id."""
        if self.is_supabase_connected:
            try:
                row = self._query_one("SELECT * FROM mentors WHERE mentor_id = %s", (mentor_id,))
                if row:
                    return row
            except Exception as e:
                print(f"DB get_mentor_by_id error: {e}")

        return _in_memory_store.mentors.get(mentor_id)

    def get_mentor_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get a mentor by username."""
        if self.is_supabase_connected:
            try:
                row = self._query_one("SELECT * FROM mentors WHERE username = %s", (username,))
                if row:
                    return row
            except Exception as e:
                print(f"DB get_mentor_by_username error: {e}")

        for m in _in_memory_store.mentors.values():
            if m.get("username") == username:
                return m
        return None

    def update_mentor(self, mentor_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update mentor profile fields."""
        if self.is_supabase_connected:
            try:
                set_parts = []
                set_vals = []
                for k, v in updates.items():
                    set_parts.append(f"{k} = %s")
                    set_vals.append(v)
                set_clause = ", ".join(set_parts)
                set_vals.append(mentor_id)
                row = self._execute_returning(
                    f"UPDATE mentors SET {set_clause} WHERE mentor_id = %s RETURNING *",
                    tuple(set_vals),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB update_mentor error: {e}")

        mentor = _in_memory_store.mentors.get(mentor_id)
        if mentor:
            mentor.update(updates)
            return mentor
        return None

    def toggle_mentor_status(self, mentor_id: str) -> Optional[Dict[str, Any]]:
        """Toggle mentor active/inactive status."""
        mentor = self.get_mentor_by_id(mentor_id)
        if not mentor:
            return None
        new_status = "Inactive" if mentor.get("status") == "Active" else "Active"
        return self.update_mentor(mentor_id, {"status": new_status})

    # =========================================================================
    # MENTOR ASSIGNMENTS
    # =========================================================================

    def assign_mentor(self, mentor_id: str, student_id: str) -> Dict[str, Any]:
        """Assign a mentor to a student."""
        now_iso = _now_iso()
        record = {
            "id": str(uuid.uuid4()),
            "mentor_id": mentor_id,
            "student_id": student_id,
            "assigned_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO mentor_assignments (id, mentor_id, student_id, assigned_at)
                       VALUES (%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["mentor_id"], record["student_id"], record["assigned_at"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB assign_mentor error: {e}")

        _in_memory_store.mentor_assignments.append(record)
        return record

    def get_students_by_mentor(self, mentor_id: str) -> List[Dict[str, Any]]:
        """Get all student IDs assigned to a mentor."""
        if self.is_supabase_connected:
            try:
                return self._query(
                    "SELECT * FROM mentor_assignments WHERE mentor_id = %s",
                    (mentor_id,),
                )
            except Exception as e:
                print(f"DB get_students_by_mentor error: {e}")

        return [a for a in _in_memory_store.mentor_assignments if a["mentor_id"] == mentor_id]

    def get_mentors_by_student(self, student_id: str) -> List[Dict[str, Any]]:
        """Get all mentor assignments for a student."""
        if self.is_supabase_connected:
            try:
                return self._query(
                    "SELECT * FROM mentor_assignments WHERE student_id = %s",
                    (student_id,),
                )
            except Exception as e:
                print(f"DB get_mentors_by_student error: {e}")

        return [a for a in _in_memory_store.mentor_assignments if a["student_id"] == student_id]

    # =========================================================================
    # NOTES (Mentor + Intervention)
    # =========================================================================

    def add_note(self, table: str, student_id: str, author: str, text: str) -> Dict[str, Any]:
        """Add a note to mentor_notes or intervention_notes table."""
        now_iso = _now_iso()
        record = {
            "id": str(uuid.uuid4()),
            "student_id": student_id,
            "author": author,
            "text": text,
            "timestamp": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    f"""INSERT INTO {table} (id, student_id, author, text, timestamp)
                        VALUES (%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["student_id"], record["author"],
                     record["text"], record["timestamp"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB add_note ({table}) error: {e}")

        if table == "mentor_notes":
            _in_memory_store.mentor_notes.append(record)
        elif table == "intervention_notes":
            _in_memory_store.intervention_notes.append(record)
        return record

    def get_notes_by_student(self, table: str, student_id: str) -> List[Dict[str, Any]]:
        """Get notes from mentor_notes or intervention_notes for a student."""
        if self.is_supabase_connected:
            try:
                return self._query(
                    f"SELECT * FROM {table} WHERE student_id = %s ORDER BY timestamp DESC",
                    (student_id,),
                )
            except Exception as e:
                print(f"DB get_notes_by_student ({table}) error: {e}")

        store_list = (
            _in_memory_store.mentor_notes if table == "mentor_notes"
            else _in_memory_store.intervention_notes
        )
        notes = [n for n in store_list if n["student_id"] == student_id]
        notes.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return notes

    # =========================================================================
    # REPORTS
    # =========================================================================

    def create_report(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a generated report record."""
        now_iso = _now_iso()
        record = {
            "id": data.get("id") or str(uuid.uuid4()),
            "name": data["name"],
            "type": data["type"],
            "generated_by": data.get("generated_by"),
            "date": now_iso,
            "size": data.get("size"),
            "filters": data.get("filters", {}),
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO reports (id, name, type, generated_by, date, size, filters)
                       VALUES (%s,%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["name"], record["type"],
                     record["generated_by"], record["date"], record["size"],
                     Json(record["filters"])),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB create_report error: {e}")

        _in_memory_store.reports.append(record)
        return record

    def get_reports_history(self) -> List[Dict[str, Any]]:
        """Get all generated reports, newest first."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM reports ORDER BY date DESC")
            except Exception as e:
                print(f"DB get_reports_history error: {e}")

        reports = list(_in_memory_store.reports)
        reports.sort(key=lambda x: x.get("date", ""), reverse=True)
        return reports

    # =========================================================================
    # REPORT SCHEDULES
    # =========================================================================

    def create_schedule(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a report schedule."""
        record = {
            "id": str(uuid.uuid4()),
            "name": data["name"],
            "type": data["type"],
            "frequency": data["frequency"],
            "email": data["email"],
            "active": data.get("active", True),
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO report_schedules (id, name, type, frequency, email, active)
                       VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["name"], record["type"],
                     record["frequency"], record["email"], record["active"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB create_schedule error: {e}")

        _in_memory_store.report_schedules.append(record)
        return record

    def get_schedules(self) -> List[Dict[str, Any]]:
        """Get all report schedules."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM report_schedules")
            except Exception as e:
                print(f"DB get_schedules error: {e}")

        return list(_in_memory_store.report_schedules)

    def delete_schedule(self, schedule_id: str) -> bool:
        """Delete a report schedule by ID."""
        if self.is_supabase_connected:
            try:
                self._execute("DELETE FROM report_schedules WHERE id = %s", (schedule_id,))
                return True
            except Exception as e:
                print(f"DB delete_schedule error: {e}")

        for i, s in enumerate(_in_memory_store.report_schedules):
            if s["id"] == schedule_id:
                _in_memory_store.report_schedules.pop(i)
                return True
        return False

    def delete_report_schedule(self, schedule_id: str) -> bool:
        """Alias for delete_schedule."""
        return self.delete_schedule(schedule_id)

    # =========================================================================
    # ACCESS LOGS
    # =========================================================================

    def log_access(self, user_name: str, role: str, action: str, student_id: Optional[str] = None) -> Dict[str, Any]:
        """Log an access event."""
        now_iso = _now_iso()
        record = {
            "id": str(uuid.uuid4()),
            "timestamp": now_iso,
            "user_name": user_name,
            "role": role,
            "action": action,
            "student_id": student_id,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO access_logs (id, timestamp, user_name, role, action, student_id)
                       VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["timestamp"], record["user_name"],
                     record["role"], record["action"], record["student_id"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB log_access error: {e}")

        _in_memory_store.access_logs.append(record)
        return record

    def get_access_logs(
        self,
        user_name: Optional[str] = None,
        action: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get access logs with optional filters."""
        if self.is_supabase_connected:
            try:
                conditions = []
                params = []
                if user_name:
                    conditions.append("user_name = %s")
                    params.append(user_name)
                if action:
                    conditions.append("action = %s")
                    params.append(action)
                where = f"WHERE {' AND '.join(conditions)}" if conditions else ""
                return self._query(
                    f"SELECT * FROM access_logs {where} ORDER BY timestamp DESC",
                    tuple(params),
                )
            except Exception as e:
                print(f"DB get_access_logs error: {e}")

        logs = list(_in_memory_store.access_logs)
        if user_name:
            logs = [l for l in logs if l["user_name"] == user_name]
        if action:
            logs = [l for l in logs if l["action"] == action]
        logs.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return logs

    # =========================================================================
    # PRIVACY DOCS
    # =========================================================================

    def get_privacy_doc(self) -> Optional[Dict[str, Any]]:
        """Get the current privacy document."""
        if self.is_supabase_connected:
            try:
                rows = self._query("SELECT * FROM privacy_docs ORDER BY updated_at DESC LIMIT 1")
                if rows:
                    return rows[0]
            except Exception as e:
                print(f"DB get_privacy_doc error: {e}")

        if _in_memory_store.privacy_docs:
            docs = sorted(_in_memory_store.privacy_docs, key=lambda x: x.get("updated_at", ""), reverse=True)
            return docs[0]
        return None

    def update_privacy_doc(self, content: str) -> Dict[str, Any]:
        """Update or create the privacy document."""
        now_iso = _now_iso()
        existing = self.get_privacy_doc()
        if existing:
            record = {**existing, "content": content, "updated_at": now_iso}
            if self.is_supabase_connected:
                try:
                    row = self._execute_returning(
                        "UPDATE privacy_docs SET content = %s, updated_at = %s WHERE id = %s RETURNING *",
                        (content, now_iso, existing["id"]),
                    )
                    if row:
                        return row
                except Exception as e:
                    print(f"DB update_privacy_doc error: {e}")

            for d in _in_memory_store.privacy_docs:
                if d["id"] == existing["id"]:
                    d["content"] = content
                    d["updated_at"] = now_iso
                    return d
            return record
        else:
            record = {
                "id": str(uuid.uuid4()),
                "content": content,
                "updated_at": now_iso,
            }
            if self.is_supabase_connected:
                try:
                    row = self._execute_returning(
                        "INSERT INTO privacy_docs (id, content, updated_at) VALUES (%s,%s,%s) RETURNING *",
                        (record["id"], record["content"], record["updated_at"]),
                    )
                    if row:
                        return row
                except Exception as e:
                    print(f"DB create_privacy_doc error: {e}")

            _in_memory_store.privacy_docs.append(record)
            return record

    # =========================================================================
    # FAIRNESS RESULTS
    # =========================================================================

    def save_fairness_result(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a fairness audit result."""
        now_iso = _now_iso()
        record = {
            "id": data.get("id") or str(uuid.uuid4()),
            "attribute": data["attribute"],
            "threshold": data.get("threshold"),
            "overall": data.get("overall", {}),
            "groups": data.get("groups", []),
            "created_at": now_iso,
        }

        if self.is_supabase_connected:
            try:
                row = self._execute_returning(
                    """INSERT INTO fairness_results (id, attribute, threshold, overall, groups, created_at)
                       VALUES (%s,%s,%s,%s,%s,%s) RETURNING *""",
                    (record["id"], record["attribute"], record["threshold"],
                     Json(record["overall"]), Json(record["groups"]), record["created_at"]),
                )
                if row:
                    return row
            except Exception as e:
                print(f"DB save_fairness_result error: {e}")

        _in_memory_store.fairness_results.append(record)
        return record

    def get_fairness_result(self, attribute: str) -> Optional[Dict[str, Any]]:
        """Get the latest fairness result for an attribute."""
        if self.is_supabase_connected:
            try:
                rows = self._query(
                    "SELECT * FROM fairness_results WHERE attribute = %s ORDER BY created_at DESC LIMIT 1",
                    (attribute,),
                )
                if rows:
                    return rows[0]
            except Exception as e:
                print(f"DB get_fairness_result error: {e}")

        matching = [r for r in _in_memory_store.fairness_results if r["attribute"] == attribute]
        if matching:
            matching.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return matching[0]
        return None

    def get_all_fairness_results(self) -> List[Dict[str, Any]]:
        """Get all fairness results."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM fairness_results ORDER BY created_at DESC")
            except Exception as e:
                print(f"DB get_all_fairness_results error: {e}")

        results = list(_in_memory_store.fairness_results)
        results.sort(key=lambda x: x.get("created_at", ""), reverse=True)
        return results

    # =========================================================================
    # FEATURE INFLUENCE
    # =========================================================================

    def save_feature_influences(self, features: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Save feature influence records (replaces existing)."""
        if self.is_supabase_connected:
            try:
                self._execute("DELETE FROM feature_influence")
            except Exception as e:
                print(f"DB clear feature_influence error: {e}")

        _in_memory_store.feature_influences.clear()

        saved = []
        for f in features:
            record = {
                "id": str(uuid.uuid4()),
                "feature": f["feature"],
                "sensitive": f.get("sensitive", False),
                "used_in_model": f.get("usedInModel", True),
                "audit_only": f.get("auditOnly", False),
            }

            if self.is_supabase_connected:
                try:
                    row = self._execute_returning(
                        """INSERT INTO feature_influence (id, feature, sensitive, used_in_model, audit_only)
                           VALUES (%s,%s,%s,%s,%s) RETURNING *""",
                        (record["id"], record["feature"], record["sensitive"],
                         record["used_in_model"], record["audit_only"]),
                    )
                    if row:
                        saved.append(row)
                        continue
                except Exception as e:
                    print(f"DB save_feature_influences error: {e}")

            _in_memory_store.feature_influences.append(record)
            saved.append(record)
        return saved

    def get_feature_influences(self) -> List[Dict[str, Any]]:
        """Get all feature influence records."""
        if self.is_supabase_connected:
            try:
                return self._query("SELECT * FROM feature_influence")
            except Exception as e:
                print(f"DB get_feature_influences error: {e}")

        return list(_in_memory_store.feature_influences)


# Global singleton instance
db_service = DatabaseService()
