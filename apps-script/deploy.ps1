# Deploy Apps Script — ชศพอ
# รันไฟล์นี้: .\deploy.ps1
# หรือ Claude จะรันให้อัตโนมัติทุกครั้งที่แก้โค้ด

$DEPLOYMENT_ID = "AKfycbxAjTFwvkDH1ezWKV3hvo_97MSSJOD1hc5Q1h70_5bgDAUex4yiC_jzEQ4Bj6TocMUV"

Write-Host "📤 Pushing code to Apps Script..." -ForegroundColor Cyan
clasp push --force

Write-Host "🚀 Deploying new version..." -ForegroundColor Cyan
clasp deploy --deploymentId $DEPLOYMENT_ID --description "Auto deploy $(Get-Date -Format 'yyyy-MM-dd HH:mm')"

Write-Host "✅ Done!" -ForegroundColor Green
