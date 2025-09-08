# test_gpt5_responses.py
import os
from openai import OpenAI
import json

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def run_test():
    # basic request with reasoning/verbosity/tool options
    resp = client.responses.create(
        model="gpt-5-mini",                        # model id
        input="summarize jeff bezos recent wedding in 11 words",
        instructions="Be concise and technical.",

        # reasoning controls
        # reasoning={"effort": "medium"},     # minimal | low | medium | high

        tools=[{ "type": "web_search_preview" }],

        # whether model can call multiple tools in parallel
        parallel_tool_calls=True,

    )

    # print useful fields
    print("response id:", getattr(resp, "id", None))
    # best-effort human text
    print("\nOUTPUT TEXT\n-----------")
    print(resp.output_text)   # convenience aggregated text

if __name__ == "__main__":
    run_test()