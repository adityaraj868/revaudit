"""
RevAudit Bot Isolation & Entity Filtering Module
Course: UCS503 Software Engineering Lab, TIET
Advisor: Dr. Sukhpal Singh | Team ArchCoders
"""

import re
from typing import Dict, Any, List

BOT_PATTERNS = [
    r"\[bot\]",
    r"^dependabot",
    r"^renovate",
    r"^github-actions",
    r"^codecov",
    r"^greenkeeper",
    r"^stale",
    r"^semantic-release-bot",
    r"^snyk-bot",
    r"^imgbot",
    r"^netlify",
    r"^vercel",
    r"^bors\[bot\]",
    r"^homu",
    r"^k8s-ci-robot",
    r"^rust-highfive",
    r"^gopherbot"
]

_COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in BOT_PATTERNS]

def is_bot_actor(username: str) -> bool:
    """
    Returns True if the username matches known CI / bot patterns.
    """
    if not username:
        return False
    u = username.strip()
    return any(pattern.search(u) for pattern in _COMPILED_PATTERNS)

def filter_pr_entities(pr: Dict[str, Any]) -> Dict[str, Any]:
    """
    Sanitizes a Pull Request record by isolating non-human actions,
    tagging bot records, and computing clean human-only review latencies.
    """
    pr_copy = dict(pr)
    
    # 1. Author Bot Check
    author = pr.get("author_id", pr.get("author", ""))
    is_author_bot = is_bot_actor(author)
    pr_copy["is_bot"] = is_author_bot

    # 2. Filter Reviews
    raw_reviews = pr.get("reviews", [])
    human_reviews = []
    bot_reviews = []
    for r in raw_reviews:
        reviewer = r.get("reviewer", "")
        if is_bot_actor(reviewer) or r.get("is_bot", False):
            bot_reviews.append(r)
        else:
            human_reviews.append(r)

    pr_copy["human_reviews"] = human_reviews
    pr_copy["bot_reviews_count"] = len(bot_reviews)

    # 3. Filter Comments
    raw_comments = pr.get("issue_comments", [])
    human_comments = [c for c in raw_comments if not is_bot_actor(c.get("author", "")) and not c.get("is_bot", False)]
    pr_copy["human_issue_comments_count"] = len(human_comments)

    return pr_copy
