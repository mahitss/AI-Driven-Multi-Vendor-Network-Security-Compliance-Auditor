# NetVigil — Official 4-Minute Hackathon Demo Script
**Track**: Taskmaster  
**Project**: NetVigil — Autonomous Network Security Engineer  
**Target Duration**: 4:00  

---

## [0:00 – 0:30] Problem Statement & The Multi-Vendor Crisis
**Visual**: Show NetVigil Console header with heterogeneous fleet inventory (Cisco, Juniper, Fortinet).

**Speaker**:
> "Enterprise networks are rarely homogeneous. In modern critical infrastructure, security operations teams are forced to manually audit configurations from multiple vendors—like Cisco, Juniper, and Fortinet—each with entirely different CLI syntax dialects.
>
> Translating compliance mandates from CIS Benchmarks or NIST into precise device changes is slow, dangerous, and error-prone. And worse: after making a change, security teams have no automated way to prove that the vulnerability was truly resolved without breaking active services."

---

## [0:30 – 0:50] Introducing NetVigil: The Autonomous Security Engineer
**Visual**: Zoom into NetVigil Console (`/agent`), showing **Agent Status: ● Online** and the Google Cloud ecosystem badges (Cloud Run, Gemini 3.5, Google ADK, Deterministic Engine).

**Speaker**:
> "Meet NetVigil. NetVigil is not a passive chatbot. It is an **autonomous AI network security engineer** powered by Gemini 3.5 and Google ADK, paired with a deterministic compliance engine.
>
> Instead of asking an AI what commands to type, we give NetVigil a high-level natural language security objective, and it autonomously investigates, plans, acts, and verifies."

---

## [0:50 – 1:20] Giving the Agent a High-Level Objective with Constraints
**Visual**: Click the **Taskmaster Golden Demo** preset:
`"Audit these network configurations against our security baseline. Fix high-risk violations, but do not modify SSH."`
Click **[ RUN SECURITY AGENT ]**.

**Speaker**:
> "Let’s give NetVigil a real-world task:
> *'Audit these configurations against our baseline. Fix high-risk violations, but do NOT modify SSH.'*
>
> Notice the negative operational constraint. NetVigil parses this boundary and locks the SSH subsystem from modification. Let's launch the agent."

---

## [1:20 – 2:00] Autonomous Multi-Vendor Investigation & Risk Prioritization
**Visual**: Show the **Agent Activity Timeline** streaming real events:
- *Discovering Fleet Configurations (Cisco, Juniper, Fortinet)*
- *Detecting Multi-Vendor Syntax*
- *Evaluating CIS Benchmark Controls*
- *Prioritizing Risks (4 P1 Findings Identified)*
- *Protected Policy Indicator shows SSH locked*

**Speaker**:
> "Watch the autonomous lifecycle execute in real time.
> NetVigil scans our fleet inventory, detects the syntax models across Cisco and Juniper, normalizes facts into our Universal Security Model, and evaluates 147 CIS compliance controls.
>
> It isolates 4 high-risk P1 findings, including cleartext Telnet exposure and unencrypted passwords. Crucially, notice how it identifies SSH findings but automatically masks them under **BLOCKED BY POLICY** because of our operator constraint."

---

## [2:00 – 2:40] Remediation Planning & Human Approval Gate
**Visual**: Switch to **Remediation Approval** tab. Show the amber **REMEDIATION REQUIRES APPROVAL** card and color-coded visual diff:
- `- transport input telnet ssh` (Red)
- `+ transport input ssh` (Green)
Click **[ APPROVE & APPLY ]**.

**Speaker**:
> "NetVigil formulates an allowlisted remediation plan and halts at an explicit human approval gate.
>
> Here we see the exact before-and-after diff: removing insecure Telnet while enforcing encrypted transports. NetVigil provides an impact assessment explaining that cleartext access will be terminated.
>
> We click **APPROVE & APPLY**. NetVigil now executes the patch through its controlled configuration engine."

---

## [2:40 – 3:20] Independent Deterministic Verification Proof
**Visual**: Show the green **VERIFICATION PASSED** dashboard.
- High-Risk Violations: $4 \rightarrow 0$ (Eliminated)
- Compliance Score: $42.5\% \rightarrow 88.0\%$
- **Negative Constraint Proof**: `SSH UNCHANGED ✓`
- Transition Table showing $FAIL \rightarrow PASS$

**Speaker**:
> "And here is the most critical agentic differentiator: **independent mathematical verification**.
>
> NetVigil does not simply assume the fix worked. It re-parses the modified configuration AST, re-evaluates all compliance rules, and proves:
> 1. High-risk violations dropped from 4 to exactly 0.
> 2. Fleet compliance score jumped from 42.5% to 88%.
> 3. And our protected SSH configuration remained 100% untouched.
>
> Zero hallucination. Complete deterministic proof."

---

## [3:20 – 3:40] Architecture & Google Cloud Foundation
**Visual**: Briefly show the **Executive Report** and the Google Cloud Run / Firestore architecture.

**Speaker**:
> "Under the hood, NetVigil runs containerized on **Google Cloud Run** with persistent state stored in **Google Cloud Firestore**. If the connection drops or another engineer logs in, the full execution state and timeline resume seamlessly."

---

## [3:40 – 4:00] Closing Value Proposition
**Visual**: Final view of the verified NetVigil Autonomous Engineer Console.

**Speaker**:
> "NetVigil doesn't stop at finding a security problem. It plans the fix, takes controlled action, and proves that the network is secure afterward.
>
> That is the power of true autonomous network engineering with Google Gemini and NetVigil. Thank you!"
