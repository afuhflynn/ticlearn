Title:

Content selection saved. Describe the issue below:

Description:

![](https://arxiv.org/static/base/1.0.1/images/icons/smileybones-small.svg)arXiv is now an independent nonprofit! [Learn more](https://info.arxiv.org/about) ×

[License: arXiv.org perpetual non-exclusive license](https://info.arxiv.org/help/license/index.html#licenses-available)

arXiv:2606.09845v1 \[cs.HC\] 27 Apr 2026

# Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher Education   A Design Case of PeteChat

Belle Li1, Lily Tan1, Wei Zakharov23, Qiang Qiu4, and Colby Ben Acton4Affiliation: 1Department of Learning Design and Technology, Purdue University, West Lafayette, IN, USA

{li4808, tyaling}@purdue.edu
Affiliation: 2Purdue Libraries and School of Information Studies, Purdue University, West Lafayette, IN, USA

wzakharov@purdue.edu
Affiliation: 3School of Engineering Education, Purdue University, West Lafayette, IN, USA
Affiliation: 4Elmore Family School of Electrical and Computer Engineering, Purdue University, West Lafayette, IN, USA

{qqiu, acton0}@purdue.edu

###### Abstract

Generative AI tutors hold significant promise for higher education, yet designing systems that scaffold learning without undermining academic integrity remains an open design challenge. This paper presents PeteChat, a course-aligned AI tutor developed and deployed at Purdue University, documented through the lens of design-based research (DBR). Drawing on formative expert evaluation with teaching assistants and UX/developer stakeholders (whose feedback also surfaced instructor-relevant concerns, as TAs reported directly on instructor-set policies and expectations), we report eight transferable design principles for assessment-aware AI tutors: from homework guardrails and debugging scaffolds to self-regulated learning support and instructor-facing customization tools. The system is built on a locally hosted large language model (Llama-3) enhanced with retrieval-augmented generation (RAG) grounded in course-specific materials. Rather than reporting controlled experimental outcomes, this design case foregrounds the situated design reasoning, iterative refinement, and principled decision-making that shaped PeteChat across four development phases. The principles and methodological approach offer actionable guidance for institutions seeking to deploy responsible, integrity-preserving AI tutors at scale.

###### Index Terms:

generative AI; educational chatbot; design-based research; self-regulated learning; academic integrity; retrieval-augmented generation; higher education

## I Introduction

Recent advances in generative artificial intelligence have spurred
interest in their applications for higher education. Large Language
Models (LLMs) like OpenAI’s GPT-4 \[ [1](https://arxiv.org/html/2606.09845v1#bib.bib1 "")\] are
capable of engaging in human-like dialogue and providing on-demand
information, which presents both opportunities and challenges for
learning environments. Early analyses suggest that such AI tools can
enhance student engagement and provide personalized support, yet they
also raise concerns about accuracy and academic integrity \[ [2](https://arxiv.org/html/2606.09845v1#bib.bib2 ""), [3](https://arxiv.org/html/2606.09845v1#bib.bib3 "")\]. Within this context, PeteChat was
conceptualized as a course-aligned LLM-powered learning assistant for
Purdue University. Major design challenges addressed include ensuring
quality of AI-provided information, alignment with course pedagogy,
student data privacy, and upholding academic integrity \[ [4](https://arxiv.org/html/2606.09845v1#bib.bib4 ""), [5](https://arxiv.org/html/2606.09845v1#bib.bib5 "")\]. By sharing specific details of the
PeteChat implementation — both successful strategies and pitfalls
encountered — this design case aims to disseminate actionable design
knowledge that others can build upon \[ [6](https://arxiv.org/html/2606.09845v1#bib.bib6 "")\].

This paper is structured as a design case \[ [6](https://arxiv.org/html/2606.09845v1#bib.bib6 "")\], foregrounding
design decisions and rationale over outcome measurements. This format is
appropriate for early-cycle innovations where rich description of the
design process yields transferable knowledge for practitioners facing
similar challenges. Rather than reporting controlled experiments, this
case documents the situated reasoning, iterative refinement, and design
principles that emerged from building and deploying PeteChat in a live
course environment.

From an HCI perspective, this work contributes to the design of
conversational AI agents in institutional settings — specifically, how
dialogue constraints, interaction affordances, and information
architecture can be structured to support learning goals within
educational chatbot deployments. The eight design principles reported
here extend prior HCI work on intelligent tutoring system interfaces
(e.g., \[ [10](https://arxiv.org/html/2606.09845v1#bib.bib10 "")\]) by addressing the underexplored intersection
of academic integrity guardrails, self-regulated learning scaffolds, and
instructor-facing customization in LLM-powered conversational agents.
Onboarding design, response formatting, retrieval provenance display,
and tone configuration are treated here not merely as implementation
details but as first-class HCI design decisions with measurable
consequences for student trust and engagement. Figure [1](https://arxiv.org/html/2606.09845v1#S1.F1 "Fig. 1 ‣ I Introduction ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat")
summarizes the motivating problems, the core design tensions, and the
conceptual positioning of PeteChat as a guardrailed, course-aligned
tutor.

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure_petechat_concept.jpg)Fig. 1: From generic answer bots to a guardrailed, course-aligned tutor: motivating problems, core design tensions, and the conceptual positioning of PeteChat.

## II Research Questions

This study is guided by three questions:

(1) What design principles emerge for AI tutors that scaffold learning
without undermining academic integrity?

(2) How can self-regulated learning (SRL) theory be operationalized in
AI-mediated dialogue?

(3) What institutional constraints shape AI tutor design in practice?

## III Context and Rationale

Purdue University, like many institutions, has seen growing student
interest in AI-driven study tools and tutoring systems. The advent of
accessible chatbots (e.g., ChatGPT) created both excitement and
uncertainty among faculty and students regarding their appropriate use
in coursework. On one hand, these tools promise immediate,
context-relevant assistance, such as answering questions about lecture
content or providing feedback on writing, potentially supporting
learners outside of class hours \[ [2](https://arxiv.org/html/2606.09845v1#bib.bib2 "")\]. On the other
hand, faculty have expressed concerns about over-reliance on AI or
misuse for completing assignments, which could undermine learning
objectives and violate academic integrity policies \[ [4](https://arxiv.org/html/2606.09845v1#bib.bib4 "")\]. In response, the PeteChat initiative was launched to proactively
and responsibly integrate AI in a principled way. Rather than banning
AI, the project sought to channel it to support learning: PeteChat was
fine-tuned on curated Purdue course materials and aligned with
instructional goals so that it could serve as a “virtual teaching
assistant” for students. This fine-tuning of institutional content
aimed to increase the relevance and accuracy of responses for the course
context. By developing our own AI assistant, we could also implement
safeguards and custom behaviors. For example, prompting the model to
refrain from simply giving away homework and assignment answers or to
follow ethical guidelines built into its training data. The rationale
for PeteChat aligns with calls in the literature to harness AI for good
in education while establishing clear frameworks to address its
challenges \[ [2](https://arxiv.org/html/2606.09845v1#bib.bib2 "")\]. It also reflects the trend of
universities experimenting with AI copilots for education, recognizing
that outright prohibition is less constructive than guiding appropriate
use.

### III-AInstitutional Context

The project is supported by Purdue’s Innovation Hub Funding Program:
Teaching & Learning in an AI-Rich Environment, and has been developed
in consultation with the Center for Instructional Excellence (CIE),
Purdue Libraries, and RCAC (Rosen Center for Advanced Computing) to
ensure alignment with pedagogy, data governance, and compute resources.
(Grant budget details are available in the project’s institutional
funding records.)

## IV Design-Based Approach

This project was conducted as a design-based research (DBR) study, an
approach well-suited for investigating innovations in real educational
settings through iterative refinement \[ [7](https://arxiv.org/html/2606.09845v1#bib.bib7 "")\]. In
DBR, researchers and practitioners collaborate to systematically design,
implement, analyze, and re-design an intervention, with the dual goals
of solving a practical problem and generating new knowledge or theory
\[ [8](https://arxiv.org/html/2606.09845v1#bib.bib8 "")\]. Unlike controlled laboratory
experiments, DBR emphasizes ecological validity by examining
interventions in authentic contexts and treating them as evolving
designs \[ [9](https://arxiv.org/html/2606.09845v1#bib.bib9 "")\]. We adopted DBR because introducing an
AI assistant into actual courses involves complex interactions
(students, instructors, curriculum, technology) that benefit from
cyclical testing and feedback. Each semester of pilot use constituted a
design cycle in which we collected data on PeteChat’s performance and
user experiences, then applied those insights to improve the next
version of the tool. This reflective, iterative process is
characteristic of DBR and helps ensure the innovation is tuned to the
setting’s needs \[ [7](https://arxiv.org/html/2606.09845v1#bib.bib7 "")\]. Figure [2](https://arxiv.org/html/2606.09845v1#S4.F2 "Fig. 2 ‣ IV Design-Based Approach ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat")
summarizes the four-phase DBR cycle that guided PeteChat’s iterative
development and redesign.

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure2_dbr_cycle_new.png)Fig. 2: Design-Based Research (DBR) cycle guiding the development of PeteChat. Four phases — needs analysis, design, evaluation, and develop — form an outer loop of information flow, while an inner classroom data loop continually feeds authentic usage evidence back to every phase.

Across the project, the work naturally crystallized into four phases,
each building on the lessons of the last:

#### Phase 1 (Summer–Fall 2024).

We began by collecting course-specific data, constructing a baseline
tutor, and fine-tuning open-source LLMs (beginning with Llama-3) on
Purdue’s Gilbreth cluster. Internal evaluations (small, rapid, and
exploratory) allowed us to retrain the model quickly as we learned what
worked and what did not.

#### Phase 2 (Fall 2024–Spring 2025).

The tutor was deployed through Gradio/Hugging Face and made available to
undergraduates in ECE 20875. This marked the first large-scale test of
the system, and the interactions gathered during Spring 2025 provided
our richest window into how students actually engaged with an AI tutor
in a demanding programming course.

#### Phase 3 (Spring–Summer 2025).

Having collected extensive preference data, we turned to Direct
Preference Optimization (DPO) to align the model’s style and scaffolding
strategies with what Purdue students found most helpful and trustworthy.
Iterative rounds of tuning noticeably strengthened the clarity,
conciseness, and pedagogical consistency of the tutor’s responses.

#### Phase 4 (Spring 2026).

With a stable, preference-aligned version of PeteChat, the project
extended into additional large undergraduate Python programming courses,
marking the transition from course-specific innovation to broader,
campus-level integration.

## V Related Work

Educational chatbot research has grown substantially over the past
decade, providing an increasingly rich design knowledge base. Kuhail et
al. (2022) systematically reviewed 36 educational chatbot studies and
identified that most systems function as teaching agents (delivering
instruction) or peer agents (facilitating collaborative learning), with
the majority relying on predetermined conversational paths and fewer
than a quarter adopting personalized approaches. Their analysis found
that while chatbots generally improved learning outcomes and
satisfaction, persistent challenges included insufficient training data
and neglect of usability heuristics, which are gaps directly addressed
in PeteChat's design. Labadze et al. \[ [11](https://arxiv.org/html/2606.09845v1#bib.bib11 "")\] extended
this picture through a systematic review of 67 studies, documenting
student benefits (homework assistance, personalized learning, skill
development) and educator benefits (time savings, improved pedagogy),
while highlighting reliability, accuracy, academic integrity, and data
privacy as barriers that careful system design must address.

The emergence of large language models (LLMs) has fundamentally changed
what is possible in educational chatbot design, while simultaneously
intensifying ethical concerns. Kasneci et al. \[ [2](https://arxiv.org/html/2606.09845v1#bib.bib2 "")\] argue that LLMs
hold genuine educational promise, enabling content creation, improved
engagement, and personalized learning, but only if teachers and learners
develop critical competencies to use them responsibly. Cotton et al. \[ [4](https://arxiv.org/html/2606.09845v1#bib.bib4 "")\] sharpen the academic integrity dimension, demonstrating that
ChatGPT substantially lowers the barrier for contract cheating while
making detection far more difficult than traditional plagiarism methods.
Their analysis shows that effective institutional responses require
diversified assessment design, transparent AI policy, and deliberate
student education, which are challenges that directly motivate
PeteChat’s guardrailed tutoring approach.

Recent design projects demonstrate how AI tutors can be embedded
responsibly within institutional contexts. Schell et al. \[ [12](https://arxiv.org/html/2606.09845v1#bib.bib12 "")\] describe
UT Sage, a generative AI chatbot platform at the University of Texas at
Austin with a dual interface: a student-facing tutorbot and a
faculty-facing ‘builder bot’ that coaches instructors using
science-of-learning principles. Configured to scaffold thinking rather
than supply answers, UT Sage parallels PeteChat’s core design
philosophy. Guo et al. \[ [13](https://arxiv.org/html/2606.09845v1#bib.bib13 "")\] report a three-year design-based research
project developing Argumate, an AI chatbot for argumentative writing
instruction that evolved from a rule-based retrieval system to a
RAG-enhanced generative model, demonstrating that grounding responses in
verified course content reliably improves relevance. Both projects
underscore the value of iterative, contextually embedded development
cycles — the same methodological stance PeteChat adopts through DBR.
Table 1 below provides a structured comparison of these and related
implementations along design dimensions directly relevant to PeteChat.

TABLE I: Recent Educational AI Assistant Implementations

| Study | Educational Context | Design Approach | Key Findings and Implications for PeteChat | Implication for PeteChat |
| --- | --- | --- | --- | --- |
| Schell et al. \[ [12](https://arxiv.org/html/2606.09845v1#bib.bib12 "")\] | Campus-wide AI adoption (University of Texas at Austin) | Dual-interface platform: “tutorbot” for students and “builder bot” for instructors; emphasizes responsible use and faculty control | Responsible integration frameworks are essential. Faculty satisfaction depends on customization capabilities, and early campus pilots show stronger engagement when ethical guidelines are clear. | PeteChat should include instructor-facing tools for oversight and customization. |
| Rienties et al. \[ [18](https://arxiv.org/html/2606.09845v1#bib.bib18 "")\] | Distance learning needs assessment (UK Open University) | Two DBR cycles exploring learner preferences for institutional vs. public AI; prototype testing with 10 students and survey validation with 96 students | Students value a “walled garden” institutional AI for privacy, academic integrity, and context-awareness over generic public tools. Concerns about generic or replicated answers remain. | Custom, institution-specific AI can address privacy and integrity concerns that public tools raise. |
| Rienties et al. \[ [19](https://arxiv.org/html/2606.09845v1#bib.bib19 "")\] | Institutional AI assistant evaluation (distance learning university) | Beta AI assistant with chat, quiz, and flashcard functions; mixed-methods evaluation using TAM, interviews, and think-aloud protocols (n=18n{=}18) | Perceived usefulness and ease of use rise when AI aligns with course context. Challenges include handling diverse prompts and scaling across courses. | Course-specific training and continuous refinement are critical for maintaining relevance and quality. |
| Guo et al. \[ [13](https://arxiv.org/html/2606.09845v1#bib.bib13 "")\] | English as a Foreign Language argumentative writing instruction | Three-year DBR project evolving from retrieval-based to generative chatbot (Argumate); iterative cycles spanning pre- and post-ChatGPT eras | Moving from rule-based to generative models improved relevance and interactivity. A balance is still needed between retrieval-based accuracy and generative flexibility. | Retrieval-augmented generation can ground responses in verified content while maintaining conversational flexibility. |
| Bolatli and Öncü \[ [17](https://arxiv.org/html/2606.09845v1#bib.bib17 "")\] | Undergraduate anatomy education | ChatGPT-driven virtual manipulatives with 3D visuals; ADDIE instructional design model; quasi-experimental pre/post test plus student interviews | The intervention improved learning, retention, and cognitive load outcomes. Students responded positively when AI support was grounded in structured, visual content. | Multimodal integration (text plus visuals or code examples) may enhance comprehension in technical subjects like programming. |
| Öncü \[ [20](https://arxiv.org/html/2606.09845v1#bib.bib20 "")\] | Academic advising at a mega-university (Anadolu University, approximately 1 million ODL students) | Multiple ChatGPT agents customized for different departments; scenario-based testing and accuracy validation against ground-truth requirements | Always-on access improves support, but accuracy varies with query complexity. Hallucinations persist in nuanced cases and human advisors remain necessary. | PeteChat needs clear boundaries on what it can and cannot handle, plus escalation paths for complex cases. |
| Chang and Lin \[ [14](https://arxiv.org/html/2606.09845v1#bib.bib14 "")\] | Theoretical framework for SRL-supporting chatbots in education | Conceptual analysis proposing three design principles: goal-setting support, feedback and reflection prompts, and personalization based on learner context | Chatbots should act as learning coaches rather than answer engines, strengthening agency and metacognition through structured guidance aligned with SRL theory. | PeteChat should integrate SRL scaffolds such as goal-setting prompts, reflection questions, and adaptive feedback instead of simply providing direct answers. |

Self-regulated learning (SRL) theory provides the pedagogical foundation
for PeteChat’s dialogue design. Chang and Lin \[ [14](https://arxiv.org/html/2606.09845v1#bib.bib14 "")\] propose three
SRL-informed principles: (1) explicit goal-setting support through
structured prompting, (2) self-assessment mechanisms and reflective
feedback, and (3) context-sensitive personalization, drawing on
Zimmerman \[ [15](https://arxiv.org/html/2606.09845v1#bib.bib15 "")\] and Pintrich \[ [16](https://arxiv.org/html/2606.09845v1#bib.bib16 "")\] to argue that chatbots must
function as learning coaches rather than answer providers. Bolatli et al. \[ [17](https://arxiv.org/html/2606.09845v1#bib.bib17 "")\] operationalize such principles in undergraduate anatomy
education using ChatGPT-driven virtual manipulatives, reporting
significant learning gains and reduced cognitive load when AI responses
are grounded in structured course content. This literature converges on
a design imperative motivating PeteChat, that is, effective AI tutors
must constrain themselves to support rather than replace student
cognition, be anchored in course-specific content via RAG, and scaffold
self-regulation explicitly.

## VI Research Inputs and Pre-Design Analysis

Before any prototype was built, we treated PeteChat’s design problem as a
pre-design evidence synthesis task. Specifically, we triangulated two
sources of evidence: (1) targeted findings from prior work on
institutional educational chatbots, self-regulated learning (SRL), and
academic integrity, and (2) a directed content analysis of authentic
student–system interactions collected during a pre-guardrail baseline
deployment. This section is therefore not a downstream evaluation of
PeteChat. Instead, it defines the evidence base that shaped the redesign
priorities later formalized in Section [X](https://arxiv.org/html/2606.09845v1#S10 "X Design Decisions Informed by First-Cycle Evaluation ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat").

### VI-ALiterature-Based Design Inputs

The targeted literature scan surfaced three recurring design pressures.
First, many prior educational chatbots were only weakly grounded in
course materials or were evaluated in generic, non-institutional
settings \[ [10](https://arxiv.org/html/2606.09845v1#bib.bib10 ""), [11](https://arxiv.org/html/2606.09845v1#bib.bib11 "")\]. This directly informed our
choice to build PeteChat around course-specific retrieval-augmented
generation (RAG) rather than rely on a generic LLM baseline. Prior
implementations such as Guo et al. \[ [13](https://arxiv.org/html/2606.09845v1#bib.bib13 "")\] further suggested that
a retrieval layer tied to course documents can improve relevance while
reducing factual fabrication.

Second, prior work highlighted the need for institutional trust,
privacy, and clear academic-integrity boundaries. Rienties et
al. \[ [18](https://arxiv.org/html/2606.09845v1#bib.bib18 ""), [19](https://arxiv.org/html/2606.09845v1#bib.bib19 "")\] show that students often prefer
institutional assistants over public tools when the former are clearly
bounded, course-aware, and privacy preserving. Those findings informed
our decision to host PeteChat locally on Purdue’s Gilbreth GPU cluster
and to position it explicitly as a learning supplement rather than a
solution engine.

Third, SRL literature made clear that effective educational chatbots
should support forethought, performance monitoring, and
self-reflection \[ [14](https://arxiv.org/html/2606.09845v1#bib.bib14 ""), [15](https://arxiv.org/html/2606.09845v1#bib.bib15 ""), [16](https://arxiv.org/html/2606.09845v1#bib.bib16 "")\]. Taken
together, these studies provided a theoretical blueprint, but they did
not tell us which design failures were most acute in our own classroom
context. For that, we turned to a baseline analysis of authentic
interactions.

### VI-BPre-Deployment Baseline Analysis

To complement the literature with institution-specific evidence, we
conducted a directed content analysis of all interactions logged during
a pre-guardrail deployment of PeteChat in ECE 20875 (Fall 2025). At
this stage, the system operated without the guardrails or SRL scaffolds
described later in Section [X](https://arxiv.org/html/2606.09845v1#S10 "X Design Decisions Informed by First-Cycle Evaluation ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat"), providing a
naturalistic baseline of student behavior and system response under
largely unmodified conditions. The corpus contains 284 messages from 31
conversations spanning three authentic late-semester task contexts:
exam preparation (47 student / 47 bot messages), homework debugging (50
/ 50), and an open-ended mini-project (45 / 45). Because these messages
were produced under genuine assessment pressure rather than in a
laboratory setting, they offered a practical view of how students and
the baseline system actually behaved.

We applied a dual-family coding scheme to the full corpus. Category A
(10 codes) captures student SRL-related behaviors grounded in
Zimmerman’s three-phase model of forethought, performance, and
self-reflection \[ [15](https://arxiv.org/html/2606.09845v1#bib.bib15 "")\]. Category B (9 codes) captures
system response alignment with PeteChat’s intended design decisions.
Each message received one primary code, with secondary codes permitted
when two behaviors were clearly co-present. The codebook was refined
through pilot coding and revision cycles. To establish inter-rater
reliability, a second independent coder coded a stratified random sample
of 60 messages (21.1% of the corpus), yielding Cohen’s
κ=.82\\kappa=.82, indicating strong agreement \[ [21](https://arxiv.org/html/2606.09845v1#bib.bib21 "")\].

Rather than reproduce the full code distributions in the main text, we
use Figure [3](https://arxiv.org/html/2606.09845v1#S6.F3 "Fig. 3 ‣ VI-B Pre-Deployment Baseline Analysis ‣ VI Research Inputs and Pre-Design Analysis ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") to surface the main
cross-context patterns and defer the complete tables to
Appendix [D](https://arxiv.org/html/2606.09845v1#A4 "Appendix D Pre-Deployment Baseline Corpus Tables ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat"). This layout keeps the main text
focused on design-relevant patterns while preserving the full coding
record for inspection.

![Refer to caption](https://arxiv.org/html/2606.09845v1/baseline_cross_context_new.png)Fig. 3: Cross-context patterns observed in the pre-deployment baseline corpus. Panel (a) shows student SRL-related behaviors (Category A) across exam preparation, homework debugging, and mini-project contexts; panel (b) shows system response alignment codes (Category B) across the same contexts. The figure highlights design-critical patterns including low self-reflection, elevated boundary testing in homework debugging, persistent generic responses, and the presence of direct-solution and stale-information failures before guardrails were introduced.

Three design pressures emerged from the baseline corpus. _First,_
_boundary and answer-control pressure._ Direct Answer / Solution Seeking
(A5) appeared in 7.0% of student messages, while Boundary Testing /
System Probing (A8) reached 13.4% overall and 22.0% in the homework
context. On the system side, Direct Solution / Over-Solving (B2)
remained present across all three contexts. Together, these patterns
show that students did actively probe for answer-giving behavior and
that the baseline system sometimes complied, establishing an empirical
basis for homework guardrails and stronger assessment-aware routing.

_Second, grounding and freshness pressure._ Although most baseline
responses were not catastrophic failures, the corpus still surfaced
Stale or Incorrect Course Information (B7) and a high proportion of
Generic / Non-Instructional output (B0, 29.6%). These patterns pointed
to two linked deficiencies: the lack of a continuously refreshed
course-grounded retrieval layer for logistics and the absence of
course-specific onboarding or instructor configuration that could shape
response style and relevance.

_Third, SRL visibility pressure._ The baseline corpus showed almost
no observable scaffold uptake or self-reflection. Hint Utilization (A7)
was not observed, and Self-Evaluation / Causal Attribution (A9)
appeared in only two messages (1.4%), with none in the mini-project
context. In other words, even when students were using the system under
real course pressure, there was little evidence that the interaction was
eliciting the forethought, monitoring, or reflection behaviors that SRL
theory would predict. This made SRL-oriented dialogue scaffolds a design
necessity rather than a merely theoretical aspiration.

### VI-CConvergent Themes and Design Blueprint

Taken together, the literature review and the baseline analysis
converged on a three-part design blueprint for PeteChat.

_Bounded institutional hosting._ Prior work emphasized privacy,
trust, and academic-integrity concerns, and the baseline corpus showed
that students actively tested system boundaries. These two sources of
evidence jointly motivated a locally hosted, clearly bounded assistant
whose role would be legible as course-aligned tutoring rather than
unrestricted public AI.

_Course-grounded freshness and relevance._ Prior design cases
suggested that RAG improves grounding, while the baseline corpus showed
that stale or generic responses erode confidence. This convergence
motivated a continuously refreshed, course-specific retrieval layer with
source attribution, freshness cues, and instructor-side update paths.

_Explicit SRL scaffolding._ SRL theory argued for goal setting,
monitoring, and reflection, and the baseline corpus showed that such
behaviors were nearly absent without explicit support. This convergence
motivated the goal-setting prompts, hint-first scaffolds, and reflection
micro-checks that later became central to PeteChat’s dialogue design.

These patterns did not simply document weaknesses in the baseline
system; they specified what the redesign had to accomplish. The next
section translates these literature-informed and baseline-grounded
pressures into the concrete design decisions that shaped the first
prototype and its subsequent refinements.

## VII First Prototype

### VII-ASystem Architecture

PeteChat is built on a locally hosted, open-source large language model
from the Llama-3 family, fine-tuned on Purdue-specific content using
parameter-efficient techniques (LoRA/QLoRA) on Purdue’s Gilbreth GPU
cluster (see Phase descriptions above). To tailor the model to our
university context, we assembled a dataset including syllabi, lecture
notes, prior years’ exams and solutions, discussion board Q&As, and
other publicly shared instructional materials from select courses (with
faculty permission). The initial target size (~1,000
instruction-style Q/A exemplars in Alpaca format — a structured
prompt-input-output schema commonly used for supervised fine-tuning of
LLMs) was reached, with incremental augmentation scheduled each semester
thereafter. Fine-tuning aimed to imbue the model with domain knowledge
of course concepts and the preferred problem-solving approaches taught
in those courses. In essence, the AI was trained to become familiar with
“how Purdue teaches X,” enabling it to align its assistance with the
instructors’ expectations. Serving was provided via Gradio/Hugging Face
under controlled course access. As a comparative baseline, off-the-shelf
chatbots (e.g., ChatGPT API) were used only to quantify improvements
from local customization; Purdue course data were not exported for
third-party fine-tuning. We also established a continuously updated
knowledge base (for example, current semester announcements or
clarifications) that PeteChat could query for the latest information,
addressing the limitation that LLMs have a fixed training cutoff date.
Figure [4](https://arxiv.org/html/2606.09845v1#S7.F4 "Fig. 4 ‣ VII-A System Architecture ‣ VII First Prototype ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") provides an overview of the
PeteChat architecture, including the query router and the expanded RAG
pipeline.

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure3_architecture_new.png)Fig. 4: Overview of the PeteChat architecture. A mixture-of-experts-inspired router dispatches each student query to the most appropriate operating mode: exam generation, MCP tools, multimodal support, or retrieval-augmented generation (RAG) Q&A. The lower panel expands the RAG pipeline, including query rewriting, multimodal retrieval, shared-vector embedding, and LLM generation with tutor guardrails.

### VII-BDialogue Design

A critical aspect of development was crafting the AI’s conversational
behavior. We programmed the assistant to follow a tutoring stance: it
tries to guide students to answers with hints and Socratic questioning
rather than directly handing over solutions. This design was influenced
by the need to prevent academic misuse and to encourage learning. For
instance, if asked for homework answers, PeteChat is designed to respond
with clarifying questions or point to relevant resources, nudging the
student to think through the problem. Such decisions were informed by
prior research on intelligent tutoring systems and the known risk of
students using ChatGPT to cheat \[ [4](https://arxiv.org/html/2606.09845v1#bib.bib4 "")\]. We also
implemented an initial content filter for inappropriate or non-academic
queries, leveraging OpenAI’s content moderation tools and custom rules
during early prototype testing; the production deployment uses a locally
hosted content filter to maintain student data privacy consistent with
the system’s local-hosting rationale. The assistant was tested with
various scenarios to fine-tune its adherence to these guidelines. We
found in early trials that the model sometimes “hallucinated”
references or overconfidently stated incorrect facts, a known issue with
LLMs \[ [2](https://arxiv.org/html/2606.09845v1#bib.bib2 "")\]. To counter this, we adjusted the prompt to
instruct the AI to cite sources from the knowledge base when possible
and to express uncertainty (e.g., saying “I’m not sure” or suggesting
where to find an answer) rather than fabricate. While not eliminating
hallucinations entirely, these adjustments reduced blatantly incorrect
answers during our testing phase. Additionally, PeteChat incorporated
reverse prompting and judgment-of-learning (JOL) micro-checks to
encourage metacognition, reinforcing its assessment-aware guardrails.
Figure [5](https://arxiv.org/html/2606.09845v1#S7.F5 "Fig. 5 ‣ VII-B Dialogue Design ‣ VII First Prototype ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") presents the low-fidelity interface
mockups used to explore alternative chat layouts and onboarding
strategies.

![Refer to caption](https://arxiv.org/html/2606.09845v1/image3.png)

![Refer to caption](https://arxiv.org/html/2606.09845v1/image4.png)

Fig. 5: Low-fidelity interface mockups of two PeteChat chat interface designs.

## VIII Evaluation of the First Prototype

Following the initial deployment of the prototype, we conducted
formative evaluation sessions to identify usability issues, pedagogical
gaps, and opportunities for improvement before the next design
iteration.

Given the formative and early-cycle nature of this evaluation, we
employed a purposive expert sample rather than a large student cohort.
This approach, consistent with DBR practice \[ [7](https://arxiv.org/html/2606.09845v1#bib.bib7 "")\], prioritizes actionable insight and rapid iteration over
statistical generalizability.

### VIII-AParticipants

We conducted four expert sessions: two TAs for ECE 20875 (covering
Python, regression, clustering, classification, and neural networks),
one software developer and one UX/UI expert with experience in learning
technologies. Sessions lasted 45–60 minutes each. This sample size is
consistent with expert usability evaluation practice, in which a small
number of evaluators typically surfaces the majority of actionable
usability issues \[ [22](https://arxiv.org/html/2606.09845v1#bib.bib22 "")\]. The study was reviewed and approved by
the Purdue University Institutional Review Board (IRB). All participants
provided informed consent prior to the sessions.

### VIII-BMaterials

Participants interacted with the running prototype (RAG-backed,
course-aware, hint-first) and reviewed sample system outputs.
Semi-structured interview protocols were tailored to each stakeholder
role: TAs focused on student needs and workload reduction, the UX
designer on interface usability and information presentation, and the
developer on technical challenges and alignment concerns.

### VIII-CProcedure

We conducted semi-structured interviews tailored to each stakeholder
role. TA interviews began with warm-up questions about their
responsibilities, and the types of challenges students struggle with
most. Participants then reviewed sample system outputs, rating accuracy
(0–100%) and identifying helpful versus confusing or misaligned
elements. Follow-up questions explored student needs the prototype did
or did not meet, repetitive TA tasks that PeteChat could realistically
handle, and features that would most reduce workload.

The UX designer interview focused on first impressions of the interface,
expectations versus actual behavior, missing affordances, clarity and
readability of outputs, and ideal redesign priorities. The developer
interview covered the origins of the chatbot concept, early design
goals, decision-making processes during development, technical
challenges encountered, and reflections on which design choices worked
well. All sessions concluded with open-ended prompts inviting any
additional insights. Audio was recorded; transcripts were anonymized and
stored on Purdue systems. Full interview protocol can be found in
Appendix A.

## IX Findings from Evaluation

Analysis of the four expert sessions yielded insights organized around
three stakeholder groups (students, TAs/instructors, and the development
team) with cross-cutting implications for user experience.

### IX-AStudent-Oriented Findings

Participants reported that heavy reliance on generic AI tools like
ChatGPT was inflating homework scores (often above 95%) while exam
performance dropped, suggesting superficial engagement with course
material. TAs observed that students frequently paste TA advice directly
into ChatGPT rather than processing it themselves. Additionally,
students increasingly skip critical instructions, such as file-naming
conventions for autograders, because, as one TA put it, they “are not
reading anymore.”

Participants identified high-value use cases where AI assistance would
be most beneficial: debugging support framed as error-message
explanations rather than code fixes, study planners and mock exams
calibrated to available time, and clarification of assignment intent
when specifications seemed ambiguous.

### IX-BTA and Instructor Findings

TAs identified regrade requests submitted without justification as a
major time sink. Students often do not understand why points were
deducted and submit appeals reflexively. TAs envisioned a system that
could auto-explain point deductions by referencing posted rubrics before
allowing students to escalate to human review.

Instructors emphasized the need for guardrails: the system should avoid
providing direct homework answers and instead respond with scaffolded,
step-by-step hints accompanied by academic-integrity reminders. For
logistics questions (e.g., deadlines, policies), responses should
include “confirm with syllabus/Piazza” disclaimers to protect
instructors from liability when information becomes stale. Instructors
also requested per-course configuration options and alignment audits to
ensure the assistant mirrors their pedagogical approach.

### IX-CDeveloper and UX Findings

The developer noted that query rewriting and multimodal RAG were already
strengths of the prototype but stressed the importance of minimizing
hallucinations and unfaithfulness to source documents. A consistent
"tutor tone" aligned with course documents was identified as a priority.

The UX designer highlighted critical onboarding gaps: new users did not
know what to ask, the sidebar was closed by default, and the chat
area's high-contrast styling (white textbox on dark
background) reduced readability. Recommended fixes included an open
sidebar with course-organized “Try asking…” example prompts,
lower-contrast chat backgrounds, and visual outputs (charts/tables) for
multi-step answers. An optional share/confirm action was also suggested
so students could verify answers with peers or TAs.

These findings converged on a positioning strategy: PeteChat should be a
“guardrailed, course-aligned tutor” that reduces TA load and deepens
learning rather than a “code-dumping bot” that inflates grades. The
platform's current strengths, multimodal RAG and query
rewriting, should be preserved while addressing the identified gaps.
These insights directly informed the design decisions for the next
iteration.

## X Design Decisions Informed by First-Cycle Evaluation

Based on the formative evaluation findings, we refined
PeteChat's design through the following decisions. Each
decision addresses specific gaps or opportunities identified during the
expert sessions.

Design Decision 1: Add homework guardrails that refuse direct
solutions and offer scaffolded hints with integrity warnings

#### Evidence addressed.

The need for homework guardrails was visible both in the baseline corpus and in the expert sessions. In the baseline analysis, direct answer seeking (A5) and boundary testing (A8) appeared across contexts, while the system still produced occasional direct solutions (B2). TAs then confirmed that heavy GPT reliance is inflating homework scores (north of 95%) while exam performance drops — a pattern consistent with broader findings on AI-enabled academic dishonesty \[ [4](https://arxiv.org/html/2606.09845v1#bib.bib4 "")\]. Together, these findings established that PeteChat needed to refuse direct homework answers while still offering pedagogically useful support.

#### Design response.

When PeteChat detects a query resembling an
active assignment item, it activates an assessment-aware mode: (a)
refuse to output complete solutions, (b) respond with step-by-step hints
aligned with the instructor's method, and (c) surface an
academic-integrity banner reminding students of course and university
policies. If the student persists, the assistant offers to explain
underlying concepts or redirect to office hours rather than provide
answers. See Figure 5.

#### Implementation.

Instructors tag assignments in the
content-upload interface, enabling the system to recognize active items.
A retrieval layer cross-references submission windows with incoming
queries.

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure5_interaction_flow_new.png)Fig. 6: Assessment-aware interaction flow. When a student query matches an active assignment, PeteChat routes through a five-stage pipeline — boundary detection, goal-setting, scaffolded hint, reflection, and SRL-aligned response — that replaces direct answering with self-regulated-learning support.

Design Decision 2: Provide logistics answers with freshness
disclaimers and “check syllabus/Piazza” prompts

#### Evidence addressed.

The baseline corpus surfaced stale or incorrect course information (B7), and instructors independently noted that logistics answers should ship with a "check syllabus/Piazza" disclaimer to avoid instructor blame when information becomes stale. Taken together, these findings suggested that logistics support was useful but needed both stronger retrieval freshness and explicit verification cues.

#### Design response.

When responding to logistics queries, PeteChat
(a) retrieves the relevant passage from the syllabus or Piazza
announcements, (b) displays a timestamp indicating when the source was
last updated, and (c) appends a disclaimer: "For the most current
information, please verify on Brightspace or Piazza." This positions the
assistant as a first-pass convenience rather than an authoritative
oracle. Figure 6 illustrates how student prompts are routed through
assessment checks, coaching pivots, hint-first responses, reverse
prompting, and judgment-of-learning (JOL) micro-checks to support
scaffolded learning rather than direct answer provision.

#### Implementation.

Course staff can push updated documents through
a lightweight upload portal that triggers re-indexing within minutes.
The interface badges sources with a freshness indicator (e.g., updated
within 7 days, 30 days, or older).

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure6_turn_level_flow_new.png)Fig. 7: Turn-level pedagogical decision flow. Each incoming turn is tested against the active-assessment registry; matched queries enter a coaching-only branch with SRL scaffolds via goal →\\rightarrow hint →\\rightarrow reflect, while unmatched queries enter a hint-first answering branch that cites sources and expresses explicit uncertainty.

Design Decision 3: Frame debugging support as error-message
explanations rather than code fixes

#### Interview finding addressed.

Participants identified debugging
support as a high-value use case, but emphasized it should be framed as
error-message explanations that teach students to read and interpret
errors themselves, rather than simply patching code for them. This
reflects a broader finding that chatbots function best as teaching
agents rather than answer providers \[ [10](https://arxiv.org/html/2606.09845v1#bib.bib10 "")\].

#### Design response.

When students paste error messages or buggy
code, PeteChat (a) explains what the error message means in plain
language, (b) identifies the likely cause without directly fixing the
code, (c) asks the student to articulate what they think is wrong before
offering additional guidance, and (d) provides hints about where to look
in their code. The assistant teaches error-reading skills rather than
providing copy-paste solutions.

#### Implementation.

A debugging-mode prompt template guides the
interaction. The system detects common Python error types and provides
tailored explanations linked to course materials on debugging
strategies.

Design Decision 4: Provide study planners and mock quiz
generators scoped to available time and upcoming exams

#### Evidence addressed.

The baseline corpus showed a striking lack of observable SRL uptake, with hint utilization (A7) absent and self-evaluation (A9) nearly absent, while expert participants identified study plans, mock exams, and time budgets as high-value forms of support that would not undermine academic integrity. This combination made study-planning features an important way to operationalize the goal-setting and self-assessment principles advocated by Chang and Lin \[ [14](https://arxiv.org/html/2606.09845v1#bib.bib14 "")\].

#### Design response.

PeteChat offers a “Study Planner” mode where
students input their available time and target topics. The assistant
generates a time-budgeted study schedule drawing from the syllabus and
past exams. A “Mock Quiz” feature generates practice questions from
the course content, provides immediate feedback on answers, and tracks
which topics need more review.

#### Implementation.

Study planners are auto-generated from syllabus
metadata (exam dates, topic coverage). Mock quizzes draw from a question
bank built from past exams and instructor-provided practice problems,
with randomization to prevent memorization.

Design Decision 5: Reduce TA workload through auto-explanations
of point deductions before allowing regrade requests

#### Interview finding addressed.

TAs identified regrade requests
without justification as a major workload pain point. Students often do
not understand why points were deducted and submit appeals reflexively.
TAs wanted auto-explanations of point deductions from rubrics.

#### Design response.

Before students can submit a regrade request,
PeteChat presents a “Regrade Helper” flow: (a) retrieve the rubric for
the relevant assignment, (b) explain in plain language which criteria
led to deductions, (c) ask the student to articulate, in their own
words, why they believe the grading was incorrect, and (d) only then
surface the option to escalate to a human TA. This structure filters
unjustified requests while educating students on rubric criteria.

#### Implementation.

The regrade explanation draws only from
instructor-provided rubrics and solutions, minimizing hallucination
risk. TAs retain full discretion over final grading decisions; the
assistant merely scaffolds the request process.

Design Decision 6: Ship a course-specific onboarding pack with a
default-open sidebar and “Try asking…” examples

#### Interview finding addressed.

UX feedback indicated that
onboarding is unclear. Users did not know what to ask. The sidebar was
closed by default, creating a blank-slate problem — a gap consistent
with prior findings that educational chatbots often neglect usability
heuristics during design \[ [10](https://arxiv.org/html/2606.09845v1#bib.bib10 "")\]. Participants recommended
a default-open sidebar with example questions/topics per course to
reduce friction.

#### Design response.

The chat interface opens with the sidebar
visible by default, displaying course-organized “Try asking…”
prompt cards. Examples are tailored to current assignments (e.g.,
“Debug my list-comprehension error for HW2,” “Explain the rubric
criteria for Project 1”). Prompt templates cover common categories:
concept clarification, debugging, study planning, and logistics.

#### Implementation.

Starter prompts are auto-generated from
syllabus metadata (assignment names, due dates, topic tags) and can be
manually overridden by instructors. A usage-analytics layer tracks which
prompts are selected most frequently, feeding back into prompt
refinement.

Design Decision 7: Improve visual readability and favor
charts/tables for multi-step answers

#### Interview finding addressed.

UX feedback identified
visual/readability issues: the white textbox brightness on dark
background reduced readability. Participants suggested favoring
charts/tables for multi-step answers and adding an optional
share/confirmation feature for answer confidence.

#### Design response.

Visual contrast on the chat area is reduced to
improve readability. When questions imply multi-step workflows (e.g.,
“How do I preprocess this data?”), PeteChat defaults to graphical or
tabular outputs rather than dense paragraphs. An optional share/verify
action allows students to forward an answer to a peer or TA for
confirmation.

#### Implementation.

The UI theme is updated with balanced contrast
ratios. Response templates detect multi-step queries and format outputs
as numbered steps, tables, or simple flowcharts. Share links generate a
read-only view of the conversation snippet.

Design Decision 8: Provide instructor/TA upload slots, clearer
retrieval provenance, and optional per-course tone configuration

#### Interview finding addressed.

The developer expressed concern
about unfaithful retrieval and giving answers too easily. Instructors
wanted a "tutor tone" and alignment with course docs. Participants
requested instructor/TA upload slots for additional documents with
clearer retrieval provenance and optional per-course tone/config.

#### Design response.

The instructor dashboard includes (a) easy
content upload and update mechanisms for syllabi, rubrics, and
announcements, (b) provenance citations in every response showing which
course documents were retrieved, (c) per-course configuration options
for tone (e.g., more formal vs. conversational) and active-assessment
thresholds, and (d) alignment audits showing how often responses cite
verified sources vs. generate content without grounding.

#### Implementation.

The upload portal supports drag-and-drop for
common file types. Retrieval provenance is displayed inline in
responses. Tone presets are configurable per course, and alignment
metrics are logged for instructor review.

## XI Design Principles

The following principles emerged from the synthesis of interview
findings. They guide feature prioritization and resolution of design
trade-offs.

1. 1.


Tutor, not solver (see Design Decisions 1, 3). Default to
hinting and scaffolding; avoid direct answers. Teach how to think
(debug explanations, step-by-step reasoning).

2. 2.


Align to the course (see Design Decisions 2, 8). Ground
responses in instructor-provided materials and show provenance; add
freshness disclaimers for logistics to protect instructors.

3. 3.


Respect academic integrity (see Design Decision 1). Include
guardrails and reminders on homework; encourage students to read and
follow instructions (e.g., file naming, policies).

4. 4.


Reduce TA overhead (see Design Decision 5). Automate clarity
(summaries of instructions), regrade explanations from rubrics, and
handle repeat questions with consistent, concise answers.

5. 5.


Design for clarity and momentum (see Design Decisions 6, 7).
Start with an open sidebar and “Try asking…” examples per
homework/exam; keep answers concise, visual when helpful, and readable
(balanced contrast).

6. 6.


Flexible control for staff (see Design Decision 8). Let
instructors/TAs upload/update content, set tone, and review alignment
metrics; make it easy to tune without code.

7. 7.


Trust through transparency (see Design Decisions 2, 7). Show
sources, note uncertainty, and provide optional share/confirm actions
so students can verify with peers/TAs.

8. 8.


Time-aware support (see Design Decision 4). Offer study plans
and mock quizzes scoped to available time and upcoming exams to keep
students on track.


Figure [8](https://arxiv.org/html/2606.09845v1#S11.F8 "Fig. 8 ‣ XI Design Principles ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") synthesizes these eight principles as concrete before/after response transformations in PeteChat. Appendix [B](https://arxiv.org/html/2606.09845v1#A2 "Appendix B Second-Prototype Interface States ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") then shows how several of these principles were instantiated in the second prototype through concrete interface states for both students and instructors, while Appendix [C](https://arxiv.org/html/2606.09845v1#A3 "Appendix C Additional Second-Prototype Screens ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") collects additional screens for debugging, logistics support, study planning, JOL checks, and TA-facing sharing or feedback flows.

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure7_design_principles_new.png)Fig. 8: The eight design principles derived from the DBR cycle. Each principle is illustrated by a minimal before/after fragment showing the concrete behavioral change the principle prescribes in PeteChat responses.

## XII Limitations and Future Directions

Several limitations should be acknowledged. First, although the paper now combines design documentation with a directed content analysis of a 284-message pre-guardrail baseline corpus and four expert sessions (n=4n=4), the overall evidence base remains formative rather than outcome validating; large-scale student learning data from later deployments will still be needed to substantiate learning claims.
Second, both the baseline corpus and the prototype evaluations are situated in a single R1 research university and primarily in one Python programming course; the baseline analysis in particular reflects one semester, 31 conversations, and one institutional context, so transferability to other disciplines, institutions, or student populations remains to be tested.
Third, as with all LLM-based systems, PeteChat carries an inherent
hallucination risk — even with RAG grounding, the model may generate
plausible but incorrect information, particularly for queries outside
the retrieval corpus; provenance citations and uncertainty disclaimers
mitigate but cannot eliminate this risk. Fourth, because the design team
and evaluators overlap substantially, there is potential for self-report
bias; future work should incorporate independent third-party
evaluation. Fifth, the SRL-aligned features (goal-setting prompts,
reflection scaffolds) are theoretically motivated but have not yet been
empirically validated against learning outcome measures. Sixth, Phases 2
and 3 involve ongoing or planned work (DPO alignment, cross-course
deployment); claims about these phases are anticipatory rather than
retrospective and will require dedicated reporting as results become
available.

## XIII Contributions

Revisiting the three research questions posed at the outset: (RQ1) Eight
transferable design principles emerged for assessment-aware AI tutors
that scaffold learning without undermining academic integrity. (RQ2)
Self-regulated learning theory was operationalized through dialogue
constraints, reflection prompts, and metacognitive scaffolding embedded
across four design decisions. (RQ3) Design-based research proved a
viable and generative methodology for iterative AI tool development in
live institutional settings — each evaluation cycle directly shaped
subsequent design decisions.

This design case contributes to the growing literature on generative AI in higher education by offering theoretical, design-oriented, and methodological insights into how large language models can be responsibly integrated as course-aligned learning assistants. Rather than evaluating a generic AI tool, this study documents the iterative design of an institutional, assessment-aware AI tutor developed and refined in authentic classroom contexts using a design-based research approach. The contributions are threefold, and they are strengthened by an explicit pre-design baseline analysis that anchors the later design choices in authentic classroom failure patterns rather than only in abstract principles.

First, this study contributes a set of transferable design principles
for assessment-aware, integrity-preserving AI tutors in higher
education. While prior work has documented the affordances and risks of
generative AI for learning, few studies articulate how AI systems can be
deliberately designed to support learning processes without undermining
academic integrity. This design case advances a principled model of an
AI tutor that operates under explicit assessment boundaries. Key design
principles include a hint-first tutoring stance, automated detection of
assessment-relevant prompts, refusal of direct solutions during active
assignments, and redirection toward conceptual explanation, strategy
rehearsal, or human support when appropriate. These principles provide
actionable guidance for institutions seeking alternatives to blanket AI
bans and extend existing discussions of “responsible AI use” into
concrete, system-level design patterns.

Second, the study demonstrates how self-regulated and self-directed
learning theories can be operationalized in AI-mediated dialogue design.
Building on established SRL frameworks (e.g., \[ [15](https://arxiv.org/html/2606.09845v1#bib.bib15 ""), [16](https://arxiv.org/html/2606.09845v1#bib.bib16 "")\]) and recent conceptual work on AI-supported learning, this study
shows how theoretical constructs, such as goal-setting, monitoring,
judgment of learning, and reflection, can be instantiated within
conversational AI interactions. Design features such as goal-setting
prompt templates, reverse prompting, JOL micro-checks, and
rubric-anchored feedback translate abstract learning theory into
observable dialogue structures. In doing so, the study moves beyond
viewing AI tutors as answer-delivery systems and instead positions them
as learning coaches that scaffold metacognitive processes. This
contribution bridges a gap between learning theory and the practical
design of generative AI systems.

Third, this design case contributes methodological insight into conducting design-based research on generative AI systems in live institutional settings. Methodologically, the study illustrates not only how DBR can be applied to rapidly evolving AI technologies while maintaining ecological validity and ethical safeguards, but also how a pre-guardrail baseline corpus can be used as a design input that links observed classroom failures to subsequent redesign choices. By documenting early expert
evaluations, stakeholder-informed redesign decisions, and the sequencing
of DBR phases across semesters, the paper offers a concrete example of
how institutions can iteratively prototype, evaluate, and govern AI
tutors under real-world constraints such as privacy, data governance,
and instructor accountability. The design case format foregrounds not
only successful design choices but also tensions, trade-offs, and
boundary decisions, contributing to a growing body of methodological
knowledge on studying AI innovations in vivo rather than in isolated
experimental settings.

## References

- \[1\]
OpenAI, “GPT-4 technical report,” 2023, doi: 10.48550/arXiv.2303.08774.

- \[2\]
E. Kasneci, K. Seßler, S. Küchemann, M. Bannert, D. Dementieva, F. Fischer, U. Gasser, G. Groh, S. Günnemann, E. Hüllermeier, S. Krusche, G. Kutyniok, T. Michaeli, C. Nerdel, J. Pfeffer, O. Poquet, M. Sailer, A. Schmidt, T. Seidel, and G. Kasneci, “ChatGPT for good? On opportunities and challenges of large language models for education,” _Learning and Individual Differences_, vol. 103, p. 102274, 2023, doi: 10.1016/j.lindif.2023.102274.

- \[3\]
L. Yan, L. Sha, L. Zhao, Y. Li, R. Martinez-Maldonado, G. Chen, X. Li, Y. Jin, and D. Gasevic, “Practical and ethical challenges of large language models in education: A systematic scoping review,” _British Journal of Educational Technology_, vol. 55, no. 4, pp. 1132–1150, 2023, doi: 10.1111/bjet.13370.

- \[4\]
D. R. E. Cotton, P. A. Cotton, and J. R. Shipway, “Chatting and cheating: Ensuring academic integrity in the era of ChatGPT,” _Innovations in Education and Teaching International_, vol. 61, no. 2, pp. 228–239, 2024, doi: 10.1080/14703297.2023.2190148.

- \[5\]
S. Slade and P. Prinsloo, “Learning analytics: Ethical issues and dilemmas,” _American Behavioral Scientist_, vol. 57, no. 10, pp. 1510–1529, 2013, doi: 10.1177/0002764213479366.

- \[6\]
E. Boling, “The need for design cases: Disseminating design knowledge,” _International Journal of Designs for Learning_, vol. 1, no. 1, pp. 1–8, 2010, doi: 10.14434/ijdl.v1i1.919.

- \[7\]
T. Anderson and J. Shattuck, “Design-based research: A decade of progress in education research?” _Educational Researcher_, vol. 41, no. 1, pp. 16–25, 2012, doi: 10.3102/0013189X11428813.

- \[8\]
Design-Based Research Collective, “Design-based research: An emerging paradigm for educational inquiry,” _Educational Researcher_, vol. 32, no. 1, pp. 5–8, 2003, doi: 10.3102/0013189X032001005.

- \[9\]
S. Barab and K. Squire, “Design-based research: Putting a stake in the ground,” _Journal of the Learning Sciences_, vol. 13, no. 1, pp. 1–14, 2004, doi: 10.1207/s15327809jls1301\_1.

- \[10\]
M. A. Kuhail, N. Alturki, S. Alramlawi, and K. Alhejori, “Interacting with educational chatbots: A systematic review,” _Education and Information Technologies_, vol. 28, pp. 973–1018, 2022, doi: 10.1007/s10639-022-11177-3.

- \[11\]
L. Labadze, M. Grigolia, and L. Machaidze, “Role of AI chatbots in education: Systematic literature review,” _International Journal of Educational Technology in Higher Education_, vol. 20, p. 56, 2023, doi: 10.1186/s41239-023-00426-1.

- \[12\]
J. Schell, K. Ford, and A. B. Markman, “Building responsible AI chatbot platforms in higher education: An evidence-based framework from design to implementation,” _Frontiers in Education_, vol. 10, Art. no. 1604934, 2025, doi: 10.3389/feduc.2025.1604934.

- \[13\]
K. Guo, E. D. Zhang, and D. Li, “Argumate: A three-year design-based research project on AI chatbots for argumentative writing instruction,” _British Journal of Educational Technology_, in press, 2025.

- \[14\]
D. Chang and M. P.-C. Lin, “Educational design principles of using AI chatbot that supports self-regulated learning in education: Goal setting, feedback, and personalization,” _Sustainability_, vol. 15, no. 17, p. 12921, 2023, doi: 10.3390/su151712921.

- \[15\]
B. J. Zimmerman, “Becoming a self-regulated learner: An overview,” _Theory Into Practice_, vol. 41, no. 2, pp. 64–70, 2002, doi: 10.1207/s15430421tip4102\_2.

- \[16\]
P. R. Pintrich, “A conceptual framework for assessing motivation and self-regulated learning in college students,” _Educational Psychology Review_, vol. 16, no. 4, pp. 385–407, 2004, doi: 10.1007/s10648-004-0006-x.

- \[17\]
Z. Bolatli and S. Öncü, “ChatGPT-driven virtual manipulatives in anatomy education,” _Computers & Education_, in press, 2025.

- \[18\]
B. Rienties _et al._, “Learner preferences for institutional versus public AI tools in distance higher education,” working paper, The Open University, 2025.

- \[19\]
B. Rienties _et al._, “Evaluation of an institutional AI assistant: Usability, trust, and course alignment,” working paper, The Open University, 2025.

- \[20\]
S. Öncü, “Leveraging ChatGPT agents for academic advising at a mega-university,” working paper, Anadolu University, 2025.

- \[21\]
J. R. Landis and G. G. Koch, “The measurement of observer agreement for categorical data,” _Biometrics_, vol. 33, no. 1, pp. 159–174, 1977.

- \[22\]
J. Nielsen, _Usability Engineering_. San Francisco, CA, USA: Morgan Kaufmann, 1994.


## Appendix A Protocol Used (Thinking-Aloud + Interview)

### A-ASession Structure (45–60 min)

1. 1.


Welcome & consent →\\rightarrow 2) Warm-up →\\rightarrow 3) Five think-aloud tasks on the
live prototype →\\rightarrow 4) Low-fi walkthrough of future features →\\rightarrow 5)
Semi-structured interview →\\rightarrow 6) Debrief.


### A-BModerator Prompts During Tasks

- •


“What are you expecting here?” / “What would you do next?” / “Say
what’s confusing (if anything).”


### A-CInterview Guide (Post-Task)

- •


_Usability & clarity_: discoverability of actions; navigation
burden; error prevention/recovery.

- •


_Pedagogical fit_: adequacy of hints; alignment with course
methods; independence vs. over-scaffolding.

- •


_Integrity_: banner clarity; perceived fairness; escalation
paths.

- •


_RAG trust_: relevance, redundancy, and how citations affect
acceptance.

- •


_Future features_: goal-setting, reflection, dashboard—value
and priority.


#### Data handling.

Audio/screen were recorded; notes and
transcripts were anonymized and stored on Purdue systems. Analytic memos
and affinity maps were versioned in the project repository; only
aggregate insights appear in dashboards and reports, in line with the
grant’s privacy and locality commitments.

## Appendix B Second-Prototype Interface States

Figure [9](https://arxiv.org/html/2606.09845v1#A2.F9 "Fig. 9 ‣ Appendix B Second-Prototype Interface States ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") presents five representative second-prototype interface states that instantiate the main design principles in concrete UI form: onboarding prompts, a goal-setting modal, hint-first homework support, a rubric-grounded regrade helper, and instructor-facing alignment controls.

![Refer to caption](https://arxiv.org/html/2606.09845v1/figure8_second_prototype_composite_clean.png)Fig. 9: Second-prototype interface states showing how the design principles were instantiated in PeteChat: (a) onboarding prompts, (b) a goal-setting modal, (c) hint-first homework support for active assignments, (d) a regrade helper grounded in published rubrics, and (e) instructor-facing controls for alignment and course configuration.

## Appendix C Additional Second-Prototype Screens

Figure [10](https://arxiv.org/html/2606.09845v1#A3.F10 "Fig. 10 ‣ Appendix C Additional Second-Prototype Screens ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat") collects additional second-prototype screens that complement the main-text interface states in Figure [9](https://arxiv.org/html/2606.09845v1#A2.F9 "Fig. 9 ‣ Appendix B Second-Prototype Interface States ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat"). These examples show how the same design principles were extended to debugging support, logistics answers with freshness warnings, study planning, judgment-of-learning checks, and TA-facing sharing or alignment feedback.

![Refer to caption](https://arxiv.org/html/2606.09845v1/appendix_second_prototype_supplement.png)Fig. 10: Additional second-prototype interface states. Shown here are (a) debugging support, (b) logistics answers with freshness disclaimers, (c) a study planner, (d) a judgment-of-learning (JOL) check, and (e) a share or TA-feedback view for alignment review.

## Appendix D Pre-Deployment Baseline Corpus Tables

This appendix reports the complete coding distributions referenced in
Section [VI](https://arxiv.org/html/2606.09845v1#S6 "VI Research Inputs and Pre-Design Analysis ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat"). Tables [II](https://arxiv.org/html/2606.09845v1#A4.T2 "TABLE II ‣ Appendix D Pre-Deployment Baseline Corpus Tables ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat")– [IV](https://arxiv.org/html/2606.09845v1#A4.T4 "TABLE IV ‣ Appendix D Pre-Deployment Baseline Corpus Tables ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat")
provide the full Category A and Category B counts and the cross-context
mapping from observed indicators to the design decisions they
motivated.

TABLE II: Distribution of Student SRL-Related Behaviors (Category A): Full Corpus and by Task Context

| Code | Label | SRL Phase | Overall n (%) | By Context (exam / hw / project) |
| --- | --- | --- | --- | --- |
| A0 | Off-Task / Non-Learning Use | Off-Task | 15 (10.6%) | 5 (10.6%) / 5 (10.0%) / 5 (11.1%) |
| A1 | Goal Setting / Task Framing | Forethought | 18 (12.7%) | 18 (38.3%) / 0 (0%) / 0 (0%) |
| A2 | Strategic Planning | Forethought | 13 (9.2%) | 7 (14.9%) / 3 (6.0%) / 3 (6.7%) |
| A3 | Adaptive Help-Seeking | Performance | 26 (18.3%) | 3 (6.4%) / 14 (28.0%) / 9 (20.0%) |
| A4 | Excessive / Broad Help-Seeking | Performance | 20 (14.1%) | 4 (8.5%) / 5 (10.0%) / 11 (24.4%) |
| A5 | Direct Answer / Solution Seeking | Performance | 10 (7.0%) | 3 (6.4%) / 4 (8.0%) / 3 (6.7%) |
| A6 | Self-Monitoring / Understanding Check | Performance | 19 (13.4%) | 1 (2.1%) / 7 (14.0%) / 11 (24.4%) |
| A7 | Hint Utilization / Scaffold Building | Performance | 0 (0.0%) | 0 / 0 / 0 |
| A8 | Boundary Testing / System Probing | Auxiliary | 19 (13.4%) | 5 (10.6%) / 11 (22.0%) / 3 (6.7%) |
| A9 | Self-Evaluation / Causal Attribution | Self-Reflection | 2 (1.4%) | 1 (2.1%) / 1 (2.0%) / 0 (0%) |

_Note:_ Highlighted rows in the manuscript discussion (A5, A7, A8, A9) indicate design-critical behaviors: direct answer-seeking, absent scaffold uptake, boundary testing, and near-absent self-reflection. n=142n=142 student messages across 31 conversations.

TABLE III: Distribution of System Response Alignment (Category B): Full Corpus and by Task Context

| Code | Label and Design Decision | Alignment | Overall n (%) | By Context (exam / hw / project) |
| --- | --- | --- | --- | --- |
| B0 | Not Applicable / Generic Response | N/A | 42 (29.6%) | 15 (31.9%) / 15 (30.0%) / 12 (26.7%) |
| B1 | Hint-First Scaffolding (DD1, aligned) | Aligned | 49 (34.5%) | 0 (0%) / 20 (40.0%) / 29 (64.4%) |
| B2 | Direct Solution / Over-Solving (DD1, misaligned) | Misaligned | 6 (4.2%) | 2 (4.3%) / 2 (4.0%) / 2 (4.4%) |
| B3 | Debugging-as-Explanation (DD3, aligned) | Aligned | 6 (4.2%) | 0 (0%) / 6 (12.0%) / 0 (0%) |
| B4 | Study Support / Planning (DD4, aligned) | Aligned | 28 (19.7%) | 28 (59.6%) / 0 (0%) / 0 (0%) |
| B5 | Boundary Enforcement / Refusal (DD5, aligned) | Aligned | 8 (5.6%) | 1 (2.1%) / 6 (12.0%) / 1 (2.2%) |
| B7 | Stale / Incorrect Course Info (DD2, misaligned) | Misaligned | 2 (1.4%) | 1 (2.1%) / 1 (2.0%) / 0 (0%) |
| B8 | No / Empty Response | N/A | 1 (0.7%) | 0 / 0 / 1 (2.2%) |

_Note:_ Highlighted rows in the manuscript discussion indicate guardrail failures (B2, B7) or generic non-instructional output (B0) motivating design revision. Overall alignment: aligned 91 (64.1%), misaligned 8 (5.6%), N/A 43 (30.3%). n=142n=142 bot messages.

TABLE IV: Cross-Context Behavioral and Alignment Summary by Task Context

| Indicator | Exam Prep (n=47n=47) | HW Debug (n=50n=50) | Mini-Project (n=45n=45) | Design Decision Triggered |
| --- | --- | --- | --- | --- |
| Student Behavior (Category A): percentage of student messages per context |
| A1 Goal Setting | 38% | 0% | 0% | →\\rightarrow DD4 study planner |
| A3 Adaptive Help-Seeking | 6% | 28% | 20% | →\\rightarrow DD3 debugging scaffold |
| A4 Broad Help-Seeking | 9% | 10% | 24% | →\\rightarrow DD3, DD6 onboarding |
| A5 Direct Answer Seeking | 6% | 8% | 7% | →\\rightarrow DD1 guardrails |
| A6 Self-Monitoring | 2% | 14% | 24% | →\\rightarrow DD4 SRL scaffolds |
| A8 Boundary Testing | 11% | 22% | 7% | →\\rightarrow DD5 integrity enforcement |
| A9 Self-Reflection | 2% | 2% | 0% | →\\rightarrow DD3, DD4 SRL scaffolds |
| System Response (Category B): percentage of bot messages per context |
| B1 Hint-First Scaffolding | 0% | 40% | 64% | →\\rightarrow DD1 aligned |
| B2 Direct Solution | 4% | 4% | 4% | →\\rightarrow DD1 guardrails needed |
| B3 Debugging-as-Explanation | 0% | 12% | 0% | →\\rightarrow DD3 needed |
| B4 Study Support | 60% | 0% | 0% | →\\rightarrow DD4 aligned |
| B5 Boundary Enforcement | 2% | 12% | 2% | →\\rightarrow DD5 aligned |
| B7 Stale Information | 2% | 2% | 0% | →\\rightarrow DD2 needed |
| B0 Generic / Non-instructional | 32% | 30% | 27% | →\\rightarrow DD6, DD8 needed |

_Note:_ This table is intended as a reference companion to Section [X](https://arxiv.org/html/2606.09845v1#S10 "X Design Decisions Informed by First-Cycle Evaluation ‣ Tutor, Not Solver: Designing a Guardrailed AI Assistant for Learning in Higher EducationA Design Case of PeteChat"). DD1–DD8 refer to the eight design decisions documented in that section.