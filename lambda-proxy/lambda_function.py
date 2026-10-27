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
    stats = requests.get(f"{parkrunnerStatsUrl}{parkrunnerId}/all",headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.6.2 Safari/605.1.15"}).content

    # TODO implement
    return {
        'statusCode': 200,
        'body': stats
    }
