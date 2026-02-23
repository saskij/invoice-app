import os
import hashlib
import re

TARGET_DIGEST = "06f9b4494bba3698ca7fc6d1587ef1e6725bc08c91636914f1bcf66563aa2a7e"
SEARCH_ROOT = "/Users/asha/.gemini/antigravity/brain/"

def check_hash(s):
    return hashlib.sha256(s.encode()).hexdigest() == TARGET_DIGEST

jwt_regex = re.compile(r'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+')

print(f"Searching for string with SHA256: {TARGET_DIGEST}")

for root, dirs, files in os.walk(SEARCH_ROOT):
    for file in files:
        path = os.path.join(root, file)
        try:
            with open(path, 'rb') as f:
                content = f.read()
                # Search for the string in bytes
                matches = re.findall(b'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+', content)
                for match_bytes in matches:
                    match = match_bytes.decode('utf-8', errors='ignore')
                    if check_hash(match):
                        print(f"FOUND MATCH in {path}: {match}")
                        exit(0)
        except Exception:
            continue

print("No match found in artifacts.")
