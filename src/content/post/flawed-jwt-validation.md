---
layout: ../../layouts/post.astro
title: Improper JWT Validation Leading to Full Account Takeover
description: Identified a business logic flaw where client-controlled pricing allowed users to complete valid purchases while paying a fraction of the intended cost.
dateFormatted: Dec 26, 2025
category: "finding"
---

---

## Improper JWT Validation Leading to Full Account Takeover

### Overview

While reviewing the application’s authentication and session management mechanisms, I identified a critical weakness in how JSON Web Tokens (JWTs) were being validated. The issue allowed attackers to forge authentication tokens and gain unauthorized access to user accounts without valid credentials.

Further to the JWT signature validation flaw, I also identified other gaps related to token lifecycle management within the application.


## What I Looked At

I focused on how the application:

* Authenticates users after login
* Validates JWTs sent via the `Authorization` header
* Manages access tokens and refresh tokens over time

My goal was to confirm that trust decisions were being enforced server-side and not delegated to user-controlled inputs.


## Primary Finding: Flawed JWT Signature Verification

JWTs rely on cryptographic signatures to ensure their integrity. By design, servers typically do not store JWTs and instead trust them based on successful signature verification.

I identified that the JWT service accepted tokens **without a valid signature**.

Although the application expected JWTs signed using the **HS256** algorithm, the server trusted the `alg` value supplied within the token header itself. By setting the algorithm to `none`, it was possible to submit an **unsigned JWT** that the server accepted as legitimate.

As a result:

* Token contents could be modified arbitrarily
* The server did not verify token integrity
* Requests authenticated using forged tokens received valid responses



## Impact: Full Account Takeover

This issue enabled **full account takeover**.

An attacker could:

* Craft a JWT with any user identifier
* Remove the signature entirely
* Submit the token via the `Authorization` header
* Gain access to the victim’s account and protected resources

No valid credentials, password compromise, or prior authentication was required.



## Other gaps in the JWT Service
### *Weak Token Lifecycle Controls*

Modern applications typically use short-lived access tokens combined with longer-lived refresh tokens to balance security and usability. Alongside the signature validation issue, I also observed weaknesses in token lifecycle management:

* Access tokens were not invalidated on logout
* Refresh token behavior was loosely enforced
* Session termination relied heavily on token expiration alone

While not the root cause of the account takeover, these weaknesses increased the blast radius of the issue by allowing forged or leaked tokens to remain valid for longer than intended.


## Remediation Recommendations

I recommended the following corrective actions:

* Enforce strict JWT signature verification on all authenticated requests
* Explicitly reject tokens using `alg=none`
* Lock verification to the expected signing algorithm (HS256)
* Ensure access and refresh tokens are revoked on logout
* Align token lifecycle controls with zero-trust principles



## Key Takeaways

* JWT security depends entirely on **correct server-side verification**
* Trusting user-controlled token headers undermines authentication
* Token lifecycle weaknesses amplify the impact of authentication flaws
* *Manual review of authentication logic is essential for uncovering these issues* - 
This issue would not be reliably detected through automated security scanning. It required understanding how authentication decisions were made and identifying where implicit trust was being placed on client-supplied data.

    This approach reflects my broader security methodology: **testing system logic, not just checking for known vulnerability patterns**.

---

