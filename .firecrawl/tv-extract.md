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

[Skip to main content](https://docs.tavily.com/documentation/api-reference/endpoint/extract#content-area)

Python SDK

Python

```
from tavily import TavilyClient

tavily_client = TavilyClient(api_key="tvly-YOUR_API_KEY")
response = tavily_client.extract("https://en.wikipedia.org/wiki/Artificial_intelligence")

print(response)
```

```
const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: "tvly-YOUR_API_KEY" });
const response = await tvly.extract("https://en.wikipedia.org/wiki/Artificial_intelligence");

console.log(response);
```

```
curl --request POST \
  --url https://api.tavily.com/extract \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "urls": "https://en.wikipedia.org/wiki/Artificial_intelligence",
  "query": "<string>",
  "chunks_per_source": 3,
  "extract_depth": "basic",
  "include_images": false,
  "include_favicon": false,
  "format": "markdown",
  "timeout": "None",
  "include_usage": false
}
'
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [\
  CURLOPT_URL => "https://api.tavily.com/extract",\
  CURLOPT_RETURNTRANSFER => true,\
  CURLOPT_ENCODING => "",\
  CURLOPT_MAXREDIRS => 10,\
  CURLOPT_TIMEOUT => 30,\
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\
  CURLOPT_CUSTOMREQUEST => "POST",\
  CURLOPT_POSTFIELDS => json_encode([\
    'urls' => 'https://en.wikipedia.org/wiki/Artificial_intelligence',\
    'query' => '<string>',\
    'chunks_per_source' => 3,\
    'extract_depth' => 'basic',\
    'include_images' => false,\
    'include_favicon' => false,\
    'format' => 'markdown',\
    'timeout' => 'None',\
    'include_usage' => false\
  ]),\
  CURLOPT_HTTPHEADER => [\
    "Authorization: Bearer <token>",\
    "Content-Type: application/json"\
  ],\
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
```

```
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.tavily.com/extract"

	payload := strings.NewReader("{\n  \"urls\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\",\n  \"query\": \"<string>\",\n  \"chunks_per_source\": 3,\n  \"extract_depth\": \"basic\",\n  \"include_images\": false,\n  \"include_favicon\": false,\n  \"format\": \"markdown\",\n  \"timeout\": \"None\",\n  \"include_usage\": false\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(string(body))

}
```

```
HttpResponse<String> response = Unirest.post("https://api.tavily.com/extract")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"urls\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\",\n  \"query\": \"<string>\",\n  \"chunks_per_source\": 3,\n  \"extract_depth\": \"basic\",\n  \"include_images\": false,\n  \"include_favicon\": false,\n  \"format\": \"markdown\",\n  \"timeout\": \"None\",\n  \"include_usage\": false\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.tavily.com/extract")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"urls\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\",\n  \"query\": \"<string>\",\n  \"chunks_per_source\": 3,\n  \"extract_depth\": \"basic\",\n  \"include_images\": false,\n  \"include_favicon\": false,\n  \"format\": \"markdown\",\n  \"timeout\": \"None\",\n  \"include_usage\": false\n}"

response = http.request(request)
puts response.read_body
```

200

partialSuccess

```
{
  "results": [\
    {\
      "url": "https://example.com/article",\
      "raw_content": "Example extracted article content.",\
      "images": []\
    }\
  ],
  "failed_results": [\
    {\
      "url": "https://example.com/unavailable",\
      "error": "Failed to retrieve content"\
    }\
  ],
  "response_time": 0.5,
  "request_id": "123e4567-e89b-12d3-a456-426614174111"
}
```

POST

/

extract

Python SDK

Python

```
from tavily import TavilyClient

tavily_client = TavilyClient(api_key="tvly-YOUR_API_KEY")
response = tavily_client.extract("https://en.wikipedia.org/wiki/Artificial_intelligence")

print(response)
```

```
const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: "tvly-YOUR_API_KEY" });
const response = await tvly.extract("https://en.wikipedia.org/wiki/Artificial_intelligence");

console.log(response);
```

```
curl --request POST \
  --url https://api.tavily.com/extract \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "urls": "https://en.wikipedia.org/wiki/Artificial_intelligence",
  "query": "<string>",
  "chunks_per_source": 3,
  "extract_depth": "basic",
  "include_images": false,
  "include_favicon": false,
  "format": "markdown",
  "timeout": "None",
  "include_usage": false
}
'
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [\
  CURLOPT_URL => "https://api.tavily.com/extract",\
  CURLOPT_RETURNTRANSFER => true,\
  CURLOPT_ENCODING => "",\
  CURLOPT_MAXREDIRS => 10,\
  CURLOPT_TIMEOUT => 30,\
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\
  CURLOPT_CUSTOMREQUEST => "POST",\
  CURLOPT_POSTFIELDS => json_encode([\
    'urls' => 'https://en.wikipedia.org/wiki/Artificial_intelligence',\
    'query' => '<string>',\
    'chunks_per_source' => 3,\
    'extract_depth' => 'basic',\
    'include_images' => false,\
    'include_favicon' => false,\
    'format' => 'markdown',\
    'timeout' => 'None',\
    'include_usage' => false\
  ]),\
  CURLOPT_HTTPHEADER => [\
    "Authorization: Bearer <token>",\
    "Content-Type: application/json"\
  ],\
]);

$response = curl_exec($curl);
$err = curl_error($curl);

curl_close($curl);

if ($err) {
  echo "cURL Error #:" . $err;
} else {
  echo $response;
}
```

```
package main

import (
	"fmt"
	"strings"
	"net/http"
	"io"
)

func main() {

	url := "https://api.tavily.com/extract"

	payload := strings.NewReader("{\n  \"urls\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\",\n  \"query\": \"<string>\",\n  \"chunks_per_source\": 3,\n  \"extract_depth\": \"basic\",\n  \"include_images\": false,\n  \"include_favicon\": false,\n  \"format\": \"markdown\",\n  \"timeout\": \"None\",\n  \"include_usage\": false\n}")

	req, _ := http.NewRequest("POST", url, payload)

	req.Header.Add("Authorization", "Bearer <token>")
	req.Header.Add("Content-Type", "application/json")

	res, _ := http.DefaultClient.Do(req)

	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)

	fmt.Println(string(body))

}
```

```
HttpResponse<String> response = Unirest.post("https://api.tavily.com/extract")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"urls\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\",\n  \"query\": \"<string>\",\n  \"chunks_per_source\": 3,\n  \"extract_depth\": \"basic\",\n  \"include_images\": false,\n  \"include_favicon\": false,\n  \"format\": \"markdown\",\n  \"timeout\": \"None\",\n  \"include_usage\": false\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.tavily.com/extract")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"urls\": \"https://en.wikipedia.org/wiki/Artificial_intelligence\",\n  \"query\": \"<string>\",\n  \"chunks_per_source\": 3,\n  \"extract_depth\": \"basic\",\n  \"include_images\": false,\n  \"include_favicon\": false,\n  \"format\": \"markdown\",\n  \"timeout\": \"None\",\n  \"include_usage\": false\n}"

response = http.request(request)
puts response.read_body
```

200

partialSuccess

```
{
  "results": [\
    {\
      "url": "https://example.com/article",\
      "raw_content": "Example extracted article content.",\
      "images": []\
    }\
  ],
  "failed_results": [\
    {\
      "url": "https://example.com/unavailable",\
      "error": "Failed to retrieve content"\
    }\
  ],
  "response_time": 0.5,
  "request_id": "123e4567-e89b-12d3-a456-426614174111"
}
```

#### Authorizations

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#authorization-authorization)

Authorization

string

header

required

Bearer authentication header in the form Bearer , where  is your Tavily API key (e.g., Bearer tvly-YOUR\_API\_KEY).

#### Body

application/json

Parameters for the Tavily Extract request.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-urls-one-of-0)

urls

stringstring\[\]stringstring\[\]

required

The URL to extract content from.

Example:

`"https://en.wikipedia.org/wiki/Artificial_intelligence"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-query)

query

string

User intent for reranking extracted content chunks. When provided, chunks are reranked based on relevance to this query.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-chunks-per-source)

chunks\_per\_source

integer

default:3

Chunks are short content snippets (about 800 characters each) pulled directly from the source. Use `chunks_per_source` to define the maximum number of relevant chunks returned per source and to control the `raw_content` length. Chunks will appear in the `raw_content` field as: `<chunk 1> [...] <chunk 2> [...] <chunk 3>`. If a page splits into no more chunks than `chunks_per_source`, its full content is returned. Available only when `query` is provided. Must be between 1 and 5.

Required range: `1 <= x <= 5`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-extract-depth)

extract\_depth

enum<string>

default:basic

The depth of the extraction process. `advanced` extraction retrieves more data, including tables and embedded content, with higher success but may increase latency.`basic` extraction costs 1 credit per 5 successful URL extractions, while `advanced` extraction costs 2 credits per 5 successful URL extractions.

Available options:

`basic`,

`advanced`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-include-images)

include\_images

boolean

default:false

Include a list of images extracted from the URLs in the response. Default is false.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-include-favicon)

include\_favicon

boolean

default:false

Whether to include the favicon URL for each result.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-format)

format

enum<string>

default:markdown

The format of the extracted web page content. `markdown` returns content in markdown format. `text` returns plain text and may increase latency.

Available options:

`markdown`,

`text`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-timeout)

timeout

number<float>

default:None

Maximum time in seconds to wait for the URL extraction before timing out. Must be between 1.0 and 60.0 seconds. If not specified, default timeouts are applied based on extract\_depth: 10 seconds for basic extraction and 30 seconds for advanced extraction.

Required range: `1 <= x <= 60`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#body-include-usage)

include\_usage

boolean

default:false

Whether to include credit usage information in the response. `NOTE:`The value may be 0 if the total successful URL extractions has not yet reached 5 calls. See our [Credits & Pricing documentation](https://docs.tavily.com/documentation/api-credits) for details.

#### Response

200

application/json

Extraction completed. Check results and failed\_results for each URL. HTTP 200 can have an empty results array when all valid URLs fail during extraction; output order is not guaranteed.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#response-results)

results

object\[\]

A list of extracted content from the provided URLs.

Showchild attributes

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#response-failed-results)

failed\_results

object\[\]

A list of URLs that could not be processed.

Showchild attributes

Example:

```
[]
```

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#response-response-time)

response\_time

number<float>

Time in seconds it took to complete the request.

Example:

`0.02`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#response-usage)

usage

object

Credit usage details for the request.

Example:

```
{ "credits": 1 }
```

[​](https://docs.tavily.com/documentation/api-reference/endpoint/extract#response-request-id)

request\_id

string

A unique request identifier you can share with customer support to help resolve issues with specific requests.

Example:

`"123e4567-e89b-12d3-a456-426614174111"`

Assistant

Responses are generated using AI and may contain mistakes.