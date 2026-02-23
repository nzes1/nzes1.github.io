---
layout: ../../layouts/post.astro
title: Business Logic Flaw Allowing Service Purchase at Arbitrary Cost
description: Identified a business logic flaw where client-controlled pricing allowed users to complete valid purchases while paying a fraction of the intended cost.
dateFormatted: Dec 25, 2025
category: "finding"
---

---

## Overview

During a security review of a newly introduced purchase feature, I identified a business logic vulnerability that allowed users to pay significantly less than the intended service cost. The issue stemmed from insufficient server-side validation of pricing data provided by the client application.

The vulnerability did not rely on traditional injection or authentication flaws, but instead exploited trust assumptions within the application’s purchase workflow.


## Feature Context

The feature allowed a primary user to purchase a service for themselves and additional users. The total cost was expected to be calculated as:

> **Service Fee × Total Number of Users (including the purchaser)**

For example, purchasing coverage for three additional users would result in a charge equivalent to four service units.


## Assessment Approach

My review focused on identifying user-controllable inputs and evaluating whether appropriate safeguards were in place to prevent abuse. While standard vulnerability categories (e.g., authentication, authorization, injection) were well-handled, I paid particular attention to **business logic enforcement**, especially around pricing and billing calculations.

This included analyzing client-server interactions during the purchase process and reviewing how pricing data was generated, transmitted, and validated.


## Vulnerability Details

During request analysis, I identified an endpoint responsible for submitting the final purchase request. This endpoint included a field representing the **total amount to be charged**.

Key observations:

* Submitting a value of zero was correctly rejected.
* However, submitting **any non-zero value**, even one far below the expected total, was accepted.
* The backend processed the transaction successfully without recalculating or validating the amount against business rules.

As a result, an attacker could purchase a service valued at, for example, $50 while paying only a nominal amount (e.g., $0.10).

The root cause was that the backend fully trusted pricing values supplied by the frontend, without enforcing server-side validation or recomputation.


## Impact

* **Financial loss risk** due to underpayment
* **Legal and audit exposure**, as receipts reflected the correct service value rather than the actual amount paid
* **Scalability risk**, particularly if manual review controls were removed or automated in the future

This issue demonstrated how business logic flaws can bypass otherwise strong technical security controls.


## Remediation & Recommendations

I recommended implementing strict server-side validation, including:

* Recalculating the total amount on the backend based on authoritative data
* Rejecting client-supplied pricing values
* Treating the frontend strictly as a presentation layer

This approach aligned with zero-trust principles and reduced reliance on downstream human validation.


## Collaboration & Resolution

Initially, there was skepticism regarding exploitability, as purchases were subject to manual review. Rather than escalating conflict, I worked collaboratively with engineering and product teams to demonstrate real-world risk scenarios.

Through joint discussions, we identified additional concerns:

* Receipts could be misused as proof of full payment
* Manual validation could be bypassed or removed in future automation
* The vulnerability could scale significantly if left unaddressed

This led to a constructive resolution where:

* The immediate issue was fixed through backend validation
* Additional input validation was implemented across related fields
* The findings informed broader planning to improve business logic enforcement across the application


## Key Takeaways

* This issue required manual business logic analysis and would not be detected through automated scanning alone.
* Business logic flaws can be as impactful as traditional vulnerabilities.
* Backend systems must remain the primary source of trust.
* Effective security outcomes often require collaboration, not confrontation.

---