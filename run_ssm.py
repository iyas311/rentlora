import boto3
import time
import sys

ssm = boto3.client('ssm', region_name='us-east-1')
instance_id = "i-0d422a71186d782c7"

commands = [
    "cd /home/ubuntu/rentlora/backend",
    "sudo docker compose exec property-service python seed.py"
]

response = ssm.send_command(
    InstanceIds=[instance_id],
    DocumentName="AWS-RunShellScript",
    Parameters={'commands': commands}
)

command_id = response['Command']['CommandId']
print(f"Command ID: {command_id}")

time.sleep(2)
while True:
    try:
        output = ssm.get_command_invocation(CommandId=command_id, InstanceId=instance_id)
        if output['Status'] in ['Success', 'Failed', 'TimedOut', 'Cancelled']:
            print(output['StandardOutputContent'])
            print(output['StandardErrorContent'], file=sys.stderr)
            sys.exit(0 if output['Status'] == 'Success' else 1)
    except ssm.exceptions.InvocationDoesNotExist:
        pass
    time.sleep(2)
