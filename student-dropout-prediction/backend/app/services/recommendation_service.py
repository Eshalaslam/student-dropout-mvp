"""
Recommendation Service.
Generates tailored academic guidance and intervention strategies based on
SHAP risk drivers and student performance signals.
"""
from typing import List, Dict, Any


class RecommendationService:
    def generate_recommendations(self, features: dict, prediction: dict, shap_reasons: list) -> List[Dict[str, str]]:
        """Generate targeted recommendations based on student's specific risk signals."""
        recommendations = []
        risk_score = prediction.get("risk_score", 0.0)
        risk_band = prediction.get("risk_band", "low")

        # Academic Approvals / Performance check
        sem1_approved = features.get("units_approved_sem1", 0)
        sem1_enrolled = features.get("units_enrolled_sem1", 1)
        sem2_approved = features.get("units_approved_sem2", 0)
        sem2_enrolled = features.get("units_enrolled_sem2", 1)

        if (sem1_enrolled > 0 and sem1_approved / sem1_enrolled < 0.6) or \
           (sem2_enrolled > 0 and sem2_approved / sem2_enrolled < 0.6):
            recommendations.append({
                "title": "Peer Tutoring & Academic Support",
                "description": "Encountering course backlogs in Semester 1/2. We recommend scheduling 1-on-1 tutoring sessions for core prerequisite subjects.",
                "action_type": "Academic Tutoring",
                "priority": "high" if risk_band == "high" else "medium"
            })

        # Financial & Tuition check
        tuition_current = features.get("tuition_fees_current", 1)
        debtor = features.get("debtor", 0)
        scholarship = features.get("scholarship_holder", 0)

        if tuition_current == 0 or debtor == 1:
            recommendations.append({
                "title": "Financial Aid & Tuition Counseling",
                "description": "Tuition payment delays or outstanding balance identified. Connect with the campus financial aid office to explore emergency grants, payment plans, or work-study programs.",
                "action_type": "Financial Counseling",
                "priority": "high"
            })
        elif scholarship == 1 and risk_score >= 0.4:
            recommendations.append({
                "title": "Scholarship Retention Academic Check-in",
                "description": "Ensure minimum GPA and credit milestones are maintained to safeguard continuing scholarship eligibility.",
                "action_type": "Scholarship Retention",
                "priority": "medium"
            })

        # Attendance & Daytime schedule check
        daytime = features.get("daytime_attendance", 1)
        age = features.get("age_at_enrollment", 20)
        if daytime == 0 or age >= 25:
            recommendations.append({
                "title": "Flexible Study & Time Management Planning",
                "description": "For working/evening or mature students, schedule a study-life balance session with an academic coach to optimize workload pacing.",
                "action_type": "Workload Planning",
                "priority": "medium"
            })

        # General High-Risk Mentor Intervention
        if risk_band == "high":
            recommendations.append({
                "title": "Dedicated Faculty Mentor Assignment",
                "description": "Model flagged elevated dropout risk. Schedule a bi-weekly progress review with the department advisor to establish early intervention checkpoints.",
                "action_type": "Mentor Advising",
                "priority": "high"
            })
        elif not recommendations:
            recommendations.append({
                "title": "Maintain Positive Academic Trajectory",
                "description": "Performance metrics are solid. Continue attending regular evaluations and consider participating in undergraduate research or leadership clubs.",
                "action_type": "Career & Enrichment",
                "priority": "info"
            })

        return recommendations
