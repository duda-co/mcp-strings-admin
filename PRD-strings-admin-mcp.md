# Product Requirements Document  
strings-admin-mcp – Model Context Protocol (MCP) Server  

---

## 1. Purpose & Background  

The existing Strings-Admin Java service manages translation keys/scopes through REST endpoints (`StringsController`, `ScopeController`). We want to expose a standards-based interface so any LLM client that supports the Model Context Protocol can call these operations natively.  

The new **strings-admin-mcp** server will act as an MCP server façade in front of the current Java service, speaking the MCP 2025-06-18 spec over the **SDIO transport** (simple duplex I/O, i.e. stdin/stdout).  
[Architecture Overview](https://modelcontextprotocol.io/docs/learn/architecture.md)

---

## 2. Objectives  

1. Provide two MCP tools for external LLMs:  
   • **createString** – add a new key to a scope.  
   • **getScopes** – list all existing scopes.  
2. Keep transport local (SDIO) for easy embedding in workflows and CI pipelines.  
3. Make deployment self-contained and configurable via environment variables.  

---

## 3. Scope  

In‐scope  
• Node-based MCP server running in folder `mcp-strings-admin/`  
• Tool definitions, validation, and mapping to downstream REST endpoints  
• Configuration, logging, health-check, and minimal error handling  
• Container-ready (Dockerfile)  

Out-of-scope  
• Changes to the underlying Java micro-service logic  
• Additional MCP utilities (progress, cancellation, etc.) beyond what spec minimally requires  

---

## 4. Functional Requirements  

### 4.1 Tool: getScopes  

| Item | Value |
|------|-------|
| Tool name | `duda_strings_admin_get_all_scopes` |
| MCP Method | `invoke/tools/get` |
| Description | Retrieves all available scopes so that clients can decide where to add keys. |
| Input schema | **none** |
| Output schema | `array<KeysScope>` (see Java DTO) |
| Downstream call | `GET {HOST}/ms/strings-admin/internal/scopes/` -> handled by `ScopeController#getAllScopes` |
| Error handling | Non-200 → MCP error `internal_error` with payload `{status, body}` |

### 4.2 Tool: createString  

| Item | Value |
|------|-------|
| Tool name | `duda_strings_admin_create_new_string_key` |
| MCP Method | `invoke/tools/call` |
| Description | Creates a new string key inside a specified scope. |
| Input schema | `MCPStringData` record:<br/>• `key` STRING<br/>• `value` STRING<br/>• `shouldTranslate` BOOLEAN<br/>• `scopeValue` STRING |
| Output schema | `null` (HTTP 204) |
| Downstream call | `POST {HOST}/ms/strings-admin/internal/keys/{scopeValue}` with JSON body derived from `toStringData()` → `StringsController#addKey` |
| Validation rules |  – `key`, `value`, `scopeValue` required, non-empty<br/> – `shouldTranslate` default `false` if omitted |
| Error handling | 400/409 from service → MCP error `invalid_request` with details<br/> 404 (scope/key) → `not_found` |

---

## 5. Non-Functional Requirements  

| Category | Requirement |
|----------|-------------|
| Performance | ≤100 ms processing overhead per tool call (local execution). |
| Availability | ≥99% when embedded in CI agent. |
| Logging | JSON logs to stdout: fields `timestamp`, `tool`, `status`, `latency_ms`, `error`. |
| Security | No external network exposure; SDIO only.  Host IP used only when server proxies HTTP calls. |
| Configurability | `STRINGS_ADMIN_HOST` env var (default `http://172.31.45.202`) |
| Observability | MCP `ping` utility implemented for liveness; optional `progress` ignored (no long running calls). |
| Versioning | SemVer, starting `v0.1.0`. |

---

## 6. System Architecture  

```mermaid
graph TD
subgraph Client (LLM)
  A["MCP Client\n(e.g. Claude)"]
end
subgraph strings-admin-mcp
  direction TB
  B[SDIO Transport\n(MCP Server Core)]
  C[Tool Registry\n(createString, getScopes)]
  D[HTTP Proxy Layer\n(axios/fetch)]
end
subgraph Java Service
  E[/ScopeController/]
  F[/StringsController/]
end

A -- MCP -> B
B --> C
C -- HTTP GET /scopes/ --> E
C -- HTTP POST /keys/{scope} --> F
```

---

## 7. Configuration & Deployment  

• Node ≥ 20 LTS  
• Environment variables  
  – `STRINGS_ADMIN_HOST` default `http://172.31.45.202`  
  – `BASE_PATH` default `/ms/strings-admin/internal/` (rarely overridden)  
• `npm run start-sdio` launches SDIO loop (reads JSON lines from stdin, writes responses).  
• Provide **Dockerfile** (distroless/node-alpine) exposing no ports.  

---

## 8. API Contract Examples  

### 8.1 getScopes call/response  

Input (MCP envelope):  
```json
{
  "id":"1",
  "method":"invoke/tools/get",
  "params":{"name":"duda_strings_admin_get_all_scopes"}
}
```  

Output:  
```json
{
  "id":"1",
  "result":[{"value":"checkout","shouldTranslate":true}, ...]
}
```  

### 8.2 createString call/response  

Input:  
```json
{
  "id":"2",
  "method":"invoke/tools/call",
  "params":{
    "name":"duda_strings_admin_create_new_string_key",
    "arguments":{
      "key":"order.status.completed",
      "value":"Completed",
      "shouldTranslate":true,
      "scopeValue":"checkout"
    }
  }
}
```  

Output (success → null payload):  
```json
{"id":"2","result":null}
```  

Error example (duplicate key):  
```json
{
  "id":"2",
  "error":{
    "code":"invalid_request",
    "message":"Key already exists",
    "data":{"status":409}
  }
}
```  

---

## 9. Acceptance Criteria  

1. Starting the binary with no args reads MCP requests from stdin and successfully returns mocked `ping`.  
2. `getScopes` returns identical list as direct call to Java service.  
3. `createString` creates a key and is idempotent on retries that result in 409 from backend.  
4. Invalid schema produces MCP `invalid_request`.  
5. End-to-end demo with Claude Desktop showing tool usage.  

---

## 10. Future Considerations  

• Add batching for bulk key creation.  
• Implement MCP `progress` utility for long-running import jobs.  
• Extend transport to WebSocket per MCP spec once external exposure is required.  

---

## 11. Glossary  

| Term | Meaning |
|------|---------|
| MCP | Model Context Protocol – open standard for tool & resource invocation by LLMs |
| SDIO | Stdin/Stdout duplex stream transport mode |
| Scope | Logical namespace grouping translation keys |
| Key | Identifier for a translatable string |

---

*References*  
• [MCP Spec 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/index.md)  
• [Model Context Protocol SDIO Transport](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports.md)  
• [llms.txt documentation index](https://modelcontextprotocol.io/llms.txt) 