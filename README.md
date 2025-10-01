# EC2 Shutdown Manager

Automated tool to stop AWS EC2 instances on demand or on schedule.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure AWS Credentials

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials:

```bash
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here
AWS_REGION=us-east-1
```

### 3. Configure Instances

Edit `src/config.json` with your EC2 instance IDs:

```json
{
  "instances": [
    "i-1234567890abcdef0",
    "i-0987654321fedcba0"
  ]
}
```

## Usage

### Check status of instances

Check all instances from config.json:

```bash
npm run status
```

Check specific instances:

```bash
node src/index.js --status i-1234567890abcdef0 i-0987654321fedcba0
```

### Stop all instances from config.json (default)

```bash
npm start
```

or

```bash
node src/index.js
```

### Stop all instances from config (explicit)

```bash
npm run stop-all
```

### Stop specific instances by ID

```bash
node src/index.js i-1234567890abcdef0 i-0987654321fedcba0
```

or with flag:

```bash
npm run stop-instances -- i-1234567890abcdef0
```

**Note:** The stop command automatically skips instances that are already stopped, so it's safe to run multiple times.

## Schedule with Cron (10 PM daily)

### macOS/Linux

Edit crontab:

```bash
crontab -e
```

Add this line (replace path with your actual path):

```bash
0 22 * * * cd /Users/freptar0/Desktop/Projects/ec2-shutdown-manager && /usr/local/bin/node src/index.js >> /tmp/ec2-shutdown.log 2>&1
```

### Windows Task Scheduler

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger: Daily at 10:00 PM
4. Action: Start a program
   - Program: `node`
   - Arguments: `src/index.js`
   - Start in: `C:\path\to\ec2-shutdown-manager`

## AWS Permissions Required (Zero Trust)

### Option 1: Basic Policy (Recommended for testing)

See `iam-policy.json` - Allows stopping any instance in a specific region:

```bash
# Create IAM user and attach policy
aws iam create-user --user-name ec2-shutdown-manager
aws iam put-user-policy --user-name ec2-shutdown-manager \
  --policy-name EC2ShutdownPolicy \
  --policy-document file://iam-policy.json
```

### Option 2: Strict Policy (Production - Zero Trust)

See `iam-policy-strict.json` - Only allows stopping specific instances:

**Before using:**
1. Edit `iam-policy-strict.json`
2. Replace `123456789012` with your AWS Account ID
3. Replace instance IDs with your actual instances
4. Update region if needed

```bash
aws iam put-user-policy --user-name ec2-shutdown-manager \
  --policy-name EC2ShutdownStrictPolicy \
  --policy-document file://iam-policy-strict.json
```

**Key security features:**
- ✅ Can only stop specific instances (by ARN)
- ✅ Can only operate in specified region
- ✅ Cannot terminate instances (explicit deny)
- ✅ Cannot modify instance attributes
- ✅ Cannot delete volumes
- ✅ Read-only access to describe instances

### Generate Access Keys

```bash
aws iam create-access-key --user-name ec2-shutdown-manager
```

Save the output credentials to your `.env` file.
