---
layout: ../../layouts/post.astro
title: Automating Authenticated Testing with Custom BurpSuite Extension & Browser Tooling
description: Built a custom Burp extension and companion browser automation to eliminate session expiry friction during authenticated testing, enabling continuous, hands-free JWT refresh across Burp tools while maintaining a valid user session in the browser.
dateFormatted: Dec 31, 2025
category: "tools"
---
---

### Automating Authenticated Testing at Scale

**Custom Tooling for Long-Lived Security Assessments**

## Overview

During an in-depth security assessment of a modern web application, I encountered a recurring friction point that significantly slowed down my testing workflow: *short-lived JWT sessions combined with aggressive inactivity timeouts*.

While these controls are valid from a security standpoint, they created a practical challenge during testing. Every few minutes, I was forced to manually re-authenticate, copy fresh tokens, and update requests in Burp tools such as the Repeater. Over time, this overhead diverted focus away from what mattered most — **deep analysis and pentest of application logic and vulnerability discovery**.

Rather than working around the problem repeatedly, I decided to **engineer a solution**.


## The Challenge

The application implemented the following authentication behavior:

* Access tokens and refresh tokens were both short-lived
* After 5–10 minutes of inactivity, the frontend displayed a *“Continue Session”* popup
* If not acknowledged within 30 seconds, the user was logged out
* Clicking *Continue Session* silently refreshed the session using a refresh token

From a testing perspective, this caused several issues:

* Requests replayed in Burp tools such as the Burp Repeater often failed due to expired tokens
* Manual copying of tokens from Burp Proxy and History to Repeater was tedious and error-prone
* Long testing sessions were constantly interrupted by session expiry
* Automation tools (Intruder, Repeater) required valid tokens at all times

I wanted a setup where:

* My browser session stayed alive
* Burp always had the latest valid access token
* Token management became invisible to my workflow


## Design Approach

I broke the problem into two distinct automation layers:

1. **Browser-side automation**
   Ensure the authenticated browser session never expires

2. **Burp-side automation**
   Ensure all Burp tools always use the most recent access token

This separation allowed each layer to do one thing well and remain adaptable to other applications.


## Browser Automation: Maintaining an Active Session

### Why browser automation was necessary

The frontend session timeout was not passive. Even minor mouse movement caused the popup to disappear without refreshing the token, which meant the session would still expire shortly after.

To reliably maintain the session, the popup had to be *explicitly clicked*, simulating a real user action.

### Solution: Tampermonkey Automation

Following some research, I settled on the Tampermonkey browser extension (Github repo: [tampermonkey](https://github.com/Tampermonkey/tampermonkey)).

  > In short, Tampermonkey is a powerful browser extension that allows userscripts to be executed on specific web pages.
  > 
  > ***Userscripts*** are small JavaScript programs that can modify page behavior, automate user interactions, and extend application functionality directly within the browser context.

After understanding how Tampermonkey operates and validating that it could effectively address the challenge I was facing, I implemented the following lightweight Tampermonkey userscript to automate the session-continuation workflow.

* Continuously monitors the DOM for the *Continue Session* popup
* Simulates a full, human-like click sequence
* Works even when the tab is not focused
* Keeps the browser session alive indefinitely

### Tampermonkey Script

```javascript
// ==UserScript==
// @name         Auto-Click Continue Session
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Automatically clicks the "Continue Session" popup to keep the session alive
// @match        https://{my-web-app-root-url}/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Run every 3 seconds to detect the inactivity popup
  setInterval(() => {
    const btn = document.querySelector(
      '[data-role="activity-monitor-continue-session"]'
    );

    if (btn) {
      console.log("Session popup detected. Refreshing session.");

      // Ensure the button is visible
      btn.scrollIntoView({ behavior: "smooth", block: "center" });

      // Simulate a real user click sequence
      ["mouseover", "mousedown", "mouseup", "click"].forEach(eventType => {
        btn.dispatchEvent(
          new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            view: window
          })
        );
      });
    }
  }, 3000);
})();
```

**Outcome:**
The browser remained authenticated for the entire testing session without manual interaction.


## Burp Automation: Injecting Fresh JWTs Automatically

### Why Burp’s native features weren’t enough

I evaluated Burp’s Session Handling Rules and macros, but they didn’t fully meet my needs:

* I needed fine-grained control over *when* and *how* tokens were updated
* Tokens had to be sourced from real application traffic(i.e., from Burp's HTTP history log), not re-issued blindly
* The solution had to work seamlessly with Repeater and Intruder.
* Scope awareness was required to avoid unintended token injection

This led me to build a *custom Burp Suite extension* in Python. I loaded the extension using Jython, leveraging Burp’s native support for Python-based extensions via the Jython standalone package. This approach allowed me to integrate directly with Burp’s request-handling workflow while maintaining the flexibility and speed of Python for rapid iteration.

## Burp Extension: Auto-Inject Latest JWT

### How the extension works

The extension implements the following logic:

1. Continuously scans Burp’s Proxy history
2. Identifies responses from the token refresh endpoint
3. Extracts the latest `access_token`
4. Stores it in memory
5. Automatically injects it into all *in-scope Repeater requests*
6. Refreshes the token pool periodically in the background

### Key Benefits

* No manual token copying
* Repeater requests always succeed
* Testing flow remains uninterrupted
* Authentication of modified requests becomes a solved problem


### Burp Extension Code (Python)

```python
# -*- coding: utf-8 -*-
# Burp Extension: Auto-Inject Latest JWT. Its purpose is to automatically inject the latest valid JWT into in-scope Repeater requests

from burp import IBurpExtender, IHttpListener, IExtensionStateListener
import re
import threading
import time

REFRESH_ENDPOINT = "{path-to-token-endpoint}/token"
ACCESS_TOKEN_REGEX = r'"access_token"\s*:\s*"([^"]+)"'

class BurpExtender(IBurpExtender, IHttpListener, IExtensionStateListener):

    def registerExtenderCallbacks(self, callbacks):
        self._callbacks = callbacks
        self._helpers = callbacks.getHelpers()
        callbacks.setExtensionName("Auto JWT Injector")

        self.latest_token = None
        self.running = True

        callbacks.registerHttpListener(self)
        callbacks.registerExtensionStateListener(self)

        # Background thread to refresh token cache
        t = threading.Thread(target=self.refresh_loop)
        t.daemon = True
        t.start()

        print("[AutoJWT] Extension loaded.")

    def refresh_loop(self):
        """Periodically scans proxy history for fresh tokens"""
        while self.running:
            self.check_latest_token()
            time.sleep(180)

    def check_latest_token(self):
        """Extract latest access token from refresh endpoint responses"""
        history = self._callbacks.getProxyHistory()
        for item in reversed(history):
            req_info = self._helpers.analyzeRequest(item)
            if REFRESH_ENDPOINT in req_info.getUrl().getPath():
                resp = item.getResponse()
                if resp:
                    resp_str = self._helpers.bytesToString(resp)
                    match = re.search(ACCESS_TOKEN_REGEX, resp_str)
                    if match:
                        token = match.group(1)
                        if token != self.latest_token:
                            self.latest_token = token
                            print("[AutoJWT] Token updated.")
                        return

    def processHttpMessage(self, toolFlag, messageIsRequest, messageInfo):
        """Inject latest JWT into in-scope Repeater requests"""
        if not messageIsRequest or not self.latest_token:
            return

        if toolFlag == self._callbacks.TOOL_REPEATER:
            req_info = self._helpers.analyzeRequest(messageInfo)
            url = req_info.getUrl()

            if not self._callbacks.isInScope(url):
                return

            headers = list(req_info.getHeaders())
            new_headers = []
            auth_found = False

            for h in headers:
                if h.lower().startswith("authorization:"):
                    new_headers.append("Authorization: Bearer " + self.latest_token)
                    auth_found = True
                else:
                    new_headers.append(h)

            if not auth_found:
                new_headers.append("Authorization: Bearer " + self.latest_token)

            body = messageInfo.getRequest()[req_info.getBodyOffset():]
            new_req = self._helpers.buildHttpMessage(new_headers, body)
            messageInfo.setRequest(new_req)

    def extensionUnloaded(self):
        self.running = False
        print("[AutoJWT] Extension unloaded.")
```


## Results & Impact

By automating both the browser session lifecycle and Burp token handling, I achieved:

* Continuous authenticated testing without interruptions
* Significant reduction in manual overhead
* Faster iteration during vulnerability discovery
* Ability to focus on logic flaws and abuse cases, not tooling friction

This setup became reusable across other applications with similar authentication patterns, requiring only minor configuration changes.

## Key Takeaway

This work reinforced an important principle in my approach to security testing:

> **Effective security testing is not just about tools — it’s about removing friction so attention stays on logic, trust boundaries, vulnerabbility and wekanesses discovery and real risk.**

By investing time in automation and custom tooling, I was able to improve both the quality and depth of my assessment work.

---