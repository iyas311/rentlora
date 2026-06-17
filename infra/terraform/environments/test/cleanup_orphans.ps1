# cleanup_orphans.ps1
# This script forcefully cleans up the specific orphaned resources that were left behind 
# when the Terraform state file was manually deleted.

$REGION = "us-east-1"
Write-Host "Starting cleanup of orphaned Rentlora resources in $REGION..." -ForegroundColor Cyan

# 1. Delete RDS Database
Write-Host "1. Deleting RDS Instance 'rentlora-db'..."
# Ignore errors if it's already deleted
aws rds delete-db-instance --db-instance-identifier rentlora-db --skip-final-snapshot --region $REGION 2>$null
if ($?) {
    Write-Host "   Waiting for RDS Database to fully delete (this can take 5-10 minutes)..." -ForegroundColor Yellow
    aws rds wait db-instance-deleted --db-instance-identifier rentlora-db --region $REGION
    Write-Host "   RDS Database deleted." -ForegroundColor Green
} else {
    Write-Host "   RDS Database 'rentlora-db' not found or already deleting." -ForegroundColor Gray
}

# 2. Delete DB Subnet Group
Write-Host "2. Deleting DB Subnet Group 'rentlora-db-subnet-group'..."
aws rds delete-db-subnet-group --db-subnet-group-name rentlora-db-subnet-group --region $REGION 2>$null
if ($?) { Write-Host "   DB Subnet Group deleted." -ForegroundColor Green } 

# 3. Delete CloudFront OAC
Write-Host "3. Deleting CloudFront OAC 'rentlora-oac'..."
$oacJson = aws cloudfront list-origin-access-controls --region $REGION | ConvertFrom-Json
$targetOac = $oacJson.OriginAccessControlList.Items | Where-Object { $_.Name -eq "rentlora-oac" }

if ($targetOac) {
    # To delete an OAC, you must first GET it to retrieve its ETag
    $oacConfig = aws cloudfront get-origin-access-control --id $targetOac.Id --region $REGION | ConvertFrom-Json
    aws cloudfront delete-origin-access-control --id $targetOac.Id --if-match $oacConfig.ETag --region $REGION 2>$null
    Write-Host "   OAC deleted." -ForegroundColor Green
} else {
    Write-Host "   OAC 'rentlora-oac' not found." -ForegroundColor Gray
}

# 4. Empty and Delete S3 Bucket
Write-Host "4. Emptying and deleting S3 Bucket 'rentlora-dev-property-images'..."
aws s3 rb s3://rentlora-dev-property-images --force --region $REGION 2>$null
if ($?) { Write-Host "   S3 Bucket deleted." -ForegroundColor Green }

Write-Host "`nCleanup Attempt Complete!" -ForegroundColor Cyan
Write-Host "IMPORTANT: Please double-check the AWS Console for any orphaned Load Balancers or Auto Scaling Groups, as those have randomized names and cannot be safely targeted via this script." -ForegroundColor Yellow
