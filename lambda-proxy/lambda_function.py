import json
from config import parkrunnerStatsUrl
import requests

def lambda_handler(event, context):
    # parkrunnerId = event
    stats = ""
    if "queryStringParameters" in event and "parkrunnerId" in event["queryStringParameters"]:
        parkrunnerId = event["queryStringParameters"]["parkrunnerId"]
    else:
        return {
            'statusCode': 400,
            'body': stats
        }
    stats = requests.get(f"{parkrunnerStatsUrl}{parkrunnerId}",
            headers={"Authorization": "Bearer"} ).json()

    # TODO implement
    return {
        'statusCode': 200,
        'body': json.dumps(stats)
    }
