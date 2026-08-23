# NetVigil — 2-Minute Evaluator Presentation Script

**Problem Statement:** SIH26155 (NTRO)  
**Presenter Goal:** Deliver a clear, crisp, technically defensible demonstration in exactly 120 seconds.

---

### [0:00 – 0:20] The Problem
> *"Good morning, respected evaluators. In critical infrastructure networks like NTRO's, security engineers manage hundreds of heterogeneous firewalls and routers from Cisco, Juniper, and Fortinet.*  
> *Auditing them manually against CIS, NIST, STIG, and ISO standards takes weeks. But handing raw configs to an LLM is dangerous—LLMs hallucinate rules, lack reproducibility, and leak credentials."*

---

### [0:20 – 0:40] The Solution & Real Ingestion
> *"NetVigil solves this with an architectural breakthrough: **Deterministic Rules Decide, AI Interprets, Humans Control**.*  
> *Let's launch our live Golden Demo. In under 200 milliseconds, our engine ingests the configuration, computes a cryptographic SHA-256 hash, identifies Cisco IOS with 90% confidence, parses the AST, and maps it into our 8-domain Universal Security Model."*

---

### [0:40 – 1:05] Deterministic Compliance & Evidence
> *"Notice: 60 security controls across CIS, NIST, STIG, and ISO were evaluated deterministically—zero LLM hallucination.*  
> *Let's click into this critical finding: Telnet is enabled instead of SSHv2. NetVigil provides line-level evidence linking directly to Line 42: `transport input telnet`."*

---

### [1:05 – 1:30] Risk Intelligence & Safe Remediation
> *"Findings are automatically correlated into a topological risk graph with P0-to-P3 priority scoring.*  
> *Our Remediation Center generates verified CLI fix blocks with clear `REMOVE` and `ADD` visual diffs. In accordance with enterprise safety standards, we enforce a strict **Zero Automated Execution Policy**—no dangerous live network pushes without human authorization."*

---

### [1:30 – 1:50] Grounded AI Advisory & Adaptive Training
> *"Now observe our OpenRouter AI Gateway. The AI receives only scrubbed, grounded facts. It explains why the vulnerability matters and how to remediate it, but it cannot alter compliance scores.*  
> *When new syntax appears, our Adaptive Training system classifies the command, validates it against a property allowlist, and presents it for human sign-off."*

---

### [1:50 – 2:00] Conclusion
> *"We generate an official executive PDF compliance audit report tracing back to the configuration hash.*  
> *In summary: NetVigil provides deterministic precision, AI-assisted interpretation, and human-governed security. Thank you."*
