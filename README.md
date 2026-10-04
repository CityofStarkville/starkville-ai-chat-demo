# City of Starkville Planning AI Assistant

An AI-powered planning and zoning assistant developed for the **City of Starkville, Mississippi**.

The Starkville Planning AI Assistant is designed to make the City's Unified Development Code (UDC) easier to navigate. Users can ask common zoning and land-use questions in plain language and receive concise responses based on official City sources, with direct links back to applicable sections of the adopted UDC.

> **Important:** The AI assistant is an informational tool. The officially adopted City of Starkville Unified Development Code remains the controlling legal source.

---

## Overview

Municipal development codes contain a large amount of detailed information about zoning districts, permitted uses, development standards, approval procedures, parking, signs, and other land-use requirements.

Finding the correct provision can be difficult for someone who does not work with the code regularly.

This project provides a conversational interface where a user can ask questions such as:

- "Can I open a restaurant in TN-N?"
- "Can I operate a food truck in O-I?"
- "Can I build a parking garage in T-5C?"
- "Is an accessory dwelling unit allowed in RN?"
- "What standards apply to an eating and drinking establishment?"

The assistant searches City-approved reference material, identifies relevant UDC provisions, and generates a plain-language response.

When a recognized UDC section is cited, the application can also provide a direct link to that section on the City's official online code.

---

## Goals

The project is intended to:

- Make zoning information easier for the public to access.
- Reduce the time required to locate commonly requested UDC information.
- Provide consistent answers based on approved City documents.
- Direct users back to the official Unified Development Code.
- Assist City staff without replacing professional review or official determinations.
- Demonstrate a practical municipal use of generative AI with controlled source material.

---

## How It Works

The application uses a retrieval-augmented generation (RAG) architecture.

Rather than allowing the AI model to answer zoning questions solely from its general training, the application retrieves relevant information from a curated City of Starkville knowledge base and provides that information to the model as context.

A simplified request looks like this:

```text
User
  │
  ▼
Starkville Planning AI Website
  │
  ▼
Amazon API Gateway
  │
  ▼
AWS Lambda
  │
  ├── Resolve common land-use terminology
  │
  ├── Search City knowledge base
  │
  ├── Retrieve applicable UDC information
  │
  ▼
Amazon Bedrock
  │
  ▼
Generated Response
  │
  ├── Zoning permission status
  ├── Applicable standards
  └── Official UDC section links
  │
  ▼
User
```

---

## AWS Architecture

The project currently uses several Amazon Web Services.

### Amazon Bedrock

Amazon Bedrock provides access to the large language model used to generate the final response.

The application currently uses **Claude Sonnet 4.6 through Amazon Bedrock**.

### Amazon Bedrock Knowledge Bases

A Bedrock Knowledge Base provides retrieval-augmented generation capabilities.

The knowledge base contains City-approved documents and specialized AI reference material derived from the Unified Development Code.

The knowledge base is used to retrieve relevant information before the AI generates an answer.

### Amazon S3

Amazon S3 stores the authoritative documents and AI reference material used by the knowledge base.

The original adopted UDC remains the controlling source.

### AWS Lambda

AWS Lambda contains the backend application logic.

Lambda is responsible for tasks including:

- Receiving questions from the website.
- Processing recent conversation context.
- Resolving common terminology and land-use aliases.
- Identifying ambiguous questions.
- Querying the Bedrock Knowledge Base.
- Sending retrieved context to the language model.
- Processing the generated response.
- Matching cited UDC sections to verified official links.
- Returning a sanitized response to the website.

### Amazon API Gateway

API Gateway provides the public HTTPS endpoint used by the web application to communicate with Lambda.

Request throttling is configured to help control traffic and costs.

### Amazon CloudWatch

CloudWatch provides operational logging and monitoring.

API access logs are configured to record operational information such as response status and latency without intentionally logging the user's question or conversation history in the API Gateway access log.

---

## Unified Development Code References

One of the primary design goals is to connect AI-generated explanations back to the City's official code.

The application maintains a verified lookup table containing UDC section numbers and their corresponding Municipal Code Online URLs.

For example:

```text
UDC Section 13.7.10
        │
        ▼
Verified lookup
        │
        ▼
Official Municipal Code Online URL
```

When the assistant cites a mapped section, the website displays an **Official UDC References** area beneath the answer.

This allows the user to move directly from the AI explanation to the official source.

### Why Links Are Verified

The language model is not trusted to invent or construct official URLs.

Instead:

1. The AI identifies the applicable UDC section.
2. Backend code extracts the section number.
3. The section number is compared against a City-maintained lookup table.
4. A link is returned only when a verified URL exists.

This makes official-code linking deterministic rather than generative.

---

## Zoning Permission References

Determining whether a land use is allowed in a zoning district requires particular care.

The application uses dedicated AI use-reference documents derived from the adopted UDC Use Chart.

These references preserve statuses such as:

| Status | Meaning |
|---|---|
| `P` | Permitted |
| `A` | Permitted subject to additional standards |
| `UE` | Use Exception |
| `SE` | Special Exception |
| `UE/SE` | Use Chart contains both designations |
| `--` | Not permitted |
| `BLANK / UNSPECIFIED` | No normal permission status is established by the reference |
| `NO USE-CHART ROW` | The provision does not have a corresponding Use Chart row |

The assistant is specifically instructed **not to infer zoning permission** from general descriptions, similar land uses, or unrelated development standards.

---

## Example

A user might ask:

```text
Can I open a restaurant in TN-N?
```

The assistant can identify "restaurant" as the official UDC use:

```text
Eating & Drinking Establishments
```

It then retrieves the applicable Use Chart information and relevant UDC standards.

A response may identify the exact zoning status and cite:

```text
UDC Section 13.7.10
```

The website can then provide a direct link to the official **Eating and Drinking Establishments** section of the Starkville UDC.

---

## Conversational Context

The assistant supports limited multi-turn conversation.

For example:

```text
User:
Can I open a restaurant in TN-N?

User:
What standards would apply?
```

Recent conversation history can be provided to the backend so the assistant can understand what the follow-up question refers to.

Conversation history is used for context only and is not allowed to override retrieved City sources.

---

## Terminology Resolution

Residents may not use the same terminology found in the UDC.

The application therefore contains a controlled alias system.

Examples include:

```text
restaurant
cafe
coffee shop
bar
        ↓
Eating & Drinking Establishments
```

and:

```text
ADU
accessory dwelling unit
garage apartment
granny flat
        ↓
Dwelling, Accessory Unit
```

Certain potentially ambiguous terms are not automatically resolved.

For example, a term such as "factory" may require clarification before the application determines which official land-use category should be searched.

---

## Guardrails

Several safeguards are incorporated into the application.

The assistant is instructed to:

- Use retrieved City of Starkville sources.
- Preserve exact Use Chart permission statuses.
- Avoid inferring zoning permission.
- Distinguish zoning permission from additional development standards.
- Avoid applying standards from one use to another.
- Preserve unusual or unspecified Use Chart conditions.
- Avoid inventing contact information.
- Avoid inventing official UDC links.
- Treat the adopted UDC as the controlling legal source.
- Encourage consultation with City staff when an official determination is required.

---

## Public API Protection

Because the application is publicly accessible, several controls are used to reduce unnecessary traffic and unexpected costs.

These include:

- API Gateway request throttling.
- Limited conversation history.
- Input-length limits.
- Request timeouts.
- AWS budget monitoring.
- CloudWatch operational logging.
- Sanitized public API responses.

The public API response intentionally contains only information required by the frontend.

---

## Cost Monitoring

AWS Budgets is configured for the pilot deployment.

The current pilot budget is:

```text
$25 per month
```

Notifications are configured at multiple thresholds, including actual and forecasted spending.

AWS Budgets provides alerts and should **not** be interpreted as a hard spending cap.

---

## Frontend

The frontend is a lightweight HTML, CSS, and JavaScript application.

It is designed to visually complement the **City of Starkville website** while remaining a standalone application.

Features include:

- Responsive design.
- City-inspired visual theme.
- Example zoning questions.
- Multi-turn conversations.
- Safe rendering of AI responses.
- Direct official UDC links.
- Request timeout handling.
- API throttling/error messages.
- New-conversation controls.

The frontend does not require a JavaScript framework.

---

## Repository Structure

As the project evolves, the intended repository structure is:

```text
starkville-planning-ai/
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
│
├── backend/
│   ├── lambda_function.py
│   ├── config.py
│   ├── prompts.py
│   ├── aliases.py
│   ├── retrieval.py
│   ├── history.py
│   ├── response_utils.py
│   ├── udc_links.py
│   └── udc_links.json
│
└── README.md
```

The project may initially contain some of these components within a single Lambda source file while the backend is being refactored.

---

## Source Authority

The AI assistant does **not** replace the Unified Development Code.

The hierarchy of authority for this project is:

```text
Officially Adopted Unified Development Code
                │
                ▼
City-Approved AI Reference Material
                │
                ▼
AI Retrieval and Interpretation
                │
                ▼
Public-Facing Answer
```

If an AI-generated response conflicts with the adopted UDC, the adopted UDC controls.

---

## Disclaimer

This application is intended to assist users in locating and understanding information contained in the City of Starkville Unified Development Code.

Responses generated by the assistant are informational and should not be considered an official zoning determination, legal opinion, permit approval, or authorization to undertake development activity.

Users should review the applicable provisions of the officially adopted Unified Development Code and contact the City of Starkville when an official determination or interpretation is required.

---

## Project Status

**Pilot / Active Development**

The application is currently being developed and tested.

Current development areas include:

- Expanding verified UDC deep-link coverage.
- Auditing AI reference documents against the adopted UDC.
- Improving terminology resolution.
- Improving multi-turn conversation handling.
- Testing zoning permission accuracy.
- Strengthening public API protections.
- Refactoring backend code for long-term maintainability.
- Preparing the application for broader public testing.

---

## Future Development

Potential future improvements include:

- Expanded coverage of UDC sections.
- Additional City planning documents.
- Improved property-specific workflows.
- GIS integration.
- Address and parcel lookup.
- Improved source citations.
- Administrative analytics.
- Automated testing against known zoning scenarios.
- Additional municipal departments or knowledge bases.

Any expansion into other City information should maintain clear separation between authoritative source material and AI-generated explanations.

---

## Technology

- **Amazon Bedrock**
- **Amazon Bedrock Knowledge Bases**
- **Anthropic Claude**
- **AWS Lambda**
- **Amazon API Gateway**
- **Amazon S3**
- **Amazon CloudWatch**
- **AWS Budgets**
- **Python**
- **JavaScript**
- **HTML**
- **CSS**
- **GitHub Pages**

---

## Official Resources

**City of Starkville**  
https://www.cityofstarkville.org/

**City of Starkville Unified Development Code**  
https://starkville.municipalcodeonline.com/book?type=development

---

## Maintainer

**City of Starkville**  
Planning & Community Development

---

## License and Reuse

This repository contains software developed for a municipal government application.

Before reusing City branding, official documents, datasets, or other City-owned materials, confirm any applicable City policies, licensing requirements, and records-management requirements.

The architecture and software concepts demonstrated by this project may be useful to other local governments exploring retrieval-augmented AI for public information services.
