Please note: This website includes an accessibility system. Press Control-F11 to adjust the website to people with visual disabilities who are using a screen reader; Press Control-F10 to open an accessibility menu.

close

Popup heading

- Press enter for Accessibility for blind people who use screen readers
- Press enter for Keyboard Navigation
- Press enter for Accessibility menu

> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.tavily.com/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.tavily.com/documentation/rate-limits#content-area)

We offer two types of rate limits based on the environment associated with your API key.

[**Get your API key** \\
\\
Create your Development or Production API keys.](https://app.tavily.com/)

| Environment | Requests per minute (RPM) |
| --- | --- |
| `Development` | 100 |
| `Production` | 1,000 |

## [​](https://docs.tavily.com/documentation/rate-limits\#crawl-endpoint-rate-limits)  Crawl Endpoint Rate Limits

The crawl endpoint has a separate rate limit that applies to both development and production keys:

| Environment | Requests per minute (RPM) |
| --- | --- |
| `Development` | 100 |
| `Production` | 100 |

## [​](https://docs.tavily.com/documentation/rate-limits\#research-endpoint-rate-limits)  Research Endpoint Rate Limits

The research endpoint has a separate rate limit that applies to both development and production keys for creating research tasks. Note that polling requests to retrieve the status of ongoing research tasks follow the default rate limits as decribed above.

| Environment | Requests per minute (RPM) |
| --- | --- |
| `Development` | 20 |
| `Production` | 20 |

## [​](https://docs.tavily.com/documentation/rate-limits\#usage-endpoint-rate-limits)  Usage Endpoint Rate Limits

The usage endpoint has a separate rate limit that applies to both development and production keys:

| Environment | Requests per 10 minutes |
| --- | --- |
| `Development` | 10 |
| `Production` | 10 |

## [​](https://docs.tavily.com/documentation/rate-limits\#handling-rate-limit-responses)  Handling Rate Limit Responses

When an API-key request exceeds a rate limit, the API returns `429 Too Many Requests`. If the response includes `Retry-After`, wait the indicated number of seconds before retrying. For example:

```
HTTP/2 429 Too Many Requests
Content-Type: application/json
Retry-After: 60

{
  "detail": {
    "error": "Your request has been blocked due to excessive requests. Please reduce the rate of requests."
  }
}
```

The 60-second delay is an example; use the value returned in the response. Error messages can vary by the limit reached; use the HTTP status and header for retry handling rather than matching the message text. [Keyless access](https://docs.tavily.com/documentation/keyless) uses a different error format and separate limits.

1. Access to production keys requires either an active **Paid Plan** or **PAYGO** enabled. More information can be found [here](https://docs.tavily.com/guides/api-credits).
2. When using the REST API, ensure you include your API key in the header to apply the correct rate limits.

Assistant

Responses are generated using AI and may contain mistakes.