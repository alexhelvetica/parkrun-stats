import json
from config import parkrunnerStatsUrl
import requests

def lambda_handler(event, context):
    stats = ""
    if "queryStringParameters" in event and "parkrunnerId" in event["queryStringParameters"]:
        parkrunnerId = event["queryStringParameters"]["parkrunnerId"]
        stats = requests.get(f"{parkrunnerStatsUrl}{parkrunnerId}").json()

    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps(stats)
    }
