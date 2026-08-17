"""
GenAI Recommendation Engine.
Interacts with an LLM to generate intervention plans based on student risk features.
"""
import os

class GenAIRecommender:
    def __init__(self):
        # Load prompt template
        template_path = os.path.join(os.path.dirname(__file__), "prompt_templates/intervention_prompt.txt")
        with open(template_path, "r") as f:
            self.prompt_template = f.read()

    def generate_intervention(self, student_id: str, risk_factors: list) -> str:
        """
        Query LLM with the formatted template to generate recommendations.
        """
        formatted_prompt = self.prompt_template.format(
            student_id=student_id,
            risk_factors="\n".join([f"- {r['feature']}: {r['impact']}" for r in risk_factors])
        )
        # TODO: Add LLM calling logic here using prompt template
        return "Stub recommendation based on risk factors."
