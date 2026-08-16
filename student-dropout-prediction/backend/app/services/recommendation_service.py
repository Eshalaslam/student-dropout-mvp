"""
Recommendation Service.
Responsible for generating personalized intervention strategies using GenAI.
"""
from genai.recommendation import GenAIRecommender

class RecommendationService:
    def __init__(self):
        self.recommender = GenAIRecommender()

    def get_recommendations(self, student_id: str, risk_factors: list):
        """
        Generate intervention plans based on SHAP risk factors.
        """
        return self.recommender.generate_intervention(student_id, risk_factors)
