> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.tavily.com/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.tavily.com/documentation/api-reference/endpoint/search#content-area)

Python SDK

Python

```
from tavily import TavilyClient

tavily_client = TavilyClient(api_key="tvly-YOUR_API_KEY")
response = tavily_client.search("Who is Leo Messi?")

print(response)
```

```
const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: "tvly-YOUR_API_KEY" });
const response = await tvly.search("Who is Leo Messi?");

console.log(response);
```

```
curl --request POST \
  --url https://api.tavily.com/search \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "query": "who is Leo Messi?",
  "search_depth": "basic",
  "chunks_per_source": 3,
  "max_results": 1,
  "topic": "general",
  "time_range": null,
  "start_date": "2025-02-09",
  "end_date": "2025-12-29",
  "include_published_date": false,
  "filter_by_published_date": false,
  "include_answer": false,
  "include_raw_content": false,
  "include_images": false,
  "include_image_descriptions": false,
  "include_favicon": false,
  "include_domains": [],
  "exclude_domains": [],
  "include_domains_mode": "restrict",
  "country": null,
  "language": "en",
  "filter_by_language": false,
  "auto_parameters": false,
  "exact_match": false,
  "include_usage": false,
  "safe_search": false
}
'
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [\
  CURLOPT_URL => "https://api.tavily.com/search",\
  CURLOPT_RETURNTRANSFER => true,\
  CURLOPT_ENCODING => "",\
  CURLOPT_MAXREDIRS => 10,\
  CURLOPT_TIMEOUT => 30,\
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\
  CURLOPT_CUSTOMREQUEST => "POST",\
  CURLOPT_POSTFIELDS => json_encode([\
    'query' => 'who is Leo Messi?',\
    'search_depth' => 'basic',\
    'chunks_per_source' => 3,\
    'max_results' => 1,\
    'topic' => 'general',\
    'time_range' => null,\
    'start_date' => '2025-02-09',\
    'end_date' => '2025-12-29',\
    'include_published_date' => false,\
    'filter_by_published_date' => false,\
    'include_answer' => false,\
    'include_raw_content' => false,\
    'include_images' => false,\
    'include_image_descriptions' => false,\
    'include_favicon' => false,\
    'include_domains' => [\
\
    ],\
    'exclude_domains' => [\
\
    ],\
    'include_domains_mode' => 'restrict',\
    'country' => null,\
    'language' => 'en',\
    'filter_by_language' => false,\
    'auto_parameters' => false,\
    'exact_match' => false,\
    'include_usage' => false,\
    'safe_search' => false\
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

	url := "https://api.tavily.com/search"

	payload := strings.NewReader("{\n  \"query\": \"who is Leo Messi?\",\n  \"search_depth\": \"basic\",\n  \"chunks_per_source\": 3,\n  \"max_results\": 1,\n  \"topic\": \"general\",\n  \"time_range\": null,\n  \"start_date\": \"2025-02-09\",\n  \"end_date\": \"2025-12-29\",\n  \"include_published_date\": false,\n  \"filter_by_published_date\": false,\n  \"include_answer\": false,\n  \"include_raw_content\": false,\n  \"include_images\": false,\n  \"include_image_descriptions\": false,\n  \"include_favicon\": false,\n  \"include_domains\": [],\n  \"exclude_domains\": [],\n  \"include_domains_mode\": \"restrict\",\n  \"country\": null,\n  \"language\": \"en\",\n  \"filter_by_language\": false,\n  \"auto_parameters\": false,\n  \"exact_match\": false,\n  \"include_usage\": false,\n  \"safe_search\": false\n}")

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
HttpResponse<String> response = Unirest.post("https://api.tavily.com/search")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"query\": \"who is Leo Messi?\",\n  \"search_depth\": \"basic\",\n  \"chunks_per_source\": 3,\n  \"max_results\": 1,\n  \"topic\": \"general\",\n  \"time_range\": null,\n  \"start_date\": \"2025-02-09\",\n  \"end_date\": \"2025-12-29\",\n  \"include_published_date\": false,\n  \"filter_by_published_date\": false,\n  \"include_answer\": false,\n  \"include_raw_content\": false,\n  \"include_images\": false,\n  \"include_image_descriptions\": false,\n  \"include_favicon\": false,\n  \"include_domains\": [],\n  \"exclude_domains\": [],\n  \"include_domains_mode\": \"restrict\",\n  \"country\": null,\n  \"language\": \"en\",\n  \"filter_by_language\": false,\n  \"auto_parameters\": false,\n  \"exact_match\": false,\n  \"include_usage\": false,\n  \"safe_search\": false\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.tavily.com/search")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"query\": \"who is Leo Messi?\",\n  \"search_depth\": \"basic\",\n  \"chunks_per_source\": 3,\n  \"max_results\": 1,\n  \"topic\": \"general\",\n  \"time_range\": null,\n  \"start_date\": \"2025-02-09\",\n  \"end_date\": \"2025-12-29\",\n  \"include_published_date\": false,\n  \"filter_by_published_date\": false,\n  \"include_answer\": false,\n  \"include_raw_content\": false,\n  \"include_images\": false,\n  \"include_image_descriptions\": false,\n  \"include_favicon\": false,\n  \"include_domains\": [],\n  \"exclude_domains\": [],\n  \"include_domains_mode\": \"restrict\",\n  \"country\": null,\n  \"language\": \"en\",\n  \"filter_by_language\": false,\n  \"auto_parameters\": false,\n  \"exact_match\": false,\n  \"include_usage\": false,\n  \"safe_search\": false\n}"

response = http.request(request)
puts response.read_body
```

200

400

401

422

429

432

433

500

```
{
  "query": "Who is Leo Messi?",
  "answer": "Lionel Messi, born in 1987, is an Argentine footballer widely regarded as one of the greatest players of his generation. He spent the majority of his career playing for FC Barcelona, where he won numerous domestic league titles and UEFA Champions League titles. Messi is known for his exceptional dribbling skills, vision, and goal-scoring ability. He has won multiple FIFA Ballon d'Or awards, numerous La Liga titles with Barcelona, and holds the record for most goals scored in a calendar year. In 2014, he led Argentina to the World Cup final, and in 2015, he helped Barcelona capture another treble. Despite turning 36 in June, Messi remains highly influential in the sport.",
  "images": [],
  "results": [\
    {\
      "title": "Lionel Messi Facts | Britannica",\
      "url": "https://www.britannica.com/facts/Lionel-Messi",\
      "content": "Lionel Messi, an Argentine footballer, is widely regarded as one of the greatest football players of his generation. Born in 1987, Messi spent the majority of his career playing for Barcelona, where he won numerous domestic league titles and UEFA Champions League titles. Messi is known for his exceptional dribbling skills, vision, and goal",\
      "score": 0.81025416,\
      "raw_content": null,\
      "published_date": "Tue, 11 Mar 2025 17:00:00 GMT",\
      "favicon": "https://britannica.com/favicon.png",\
      "images": [\
        {\
          "url": "<string>",\
          "description": "<string>"\
        }\
      ],\
      "id": "a3f9c2-04"\
    }\
  ],
  "response_time": "1.67",
  "auto_parameters": {
    "topic": "general",
    "search_depth": "basic"
  },
  "usage": {
    "credits": 1
  },
  "request_id": "123e4567-e89b-12d3-a456-426614174111"
}
```

```
{
  "detail": {
    "error": "<400 Bad Request, (e.g Invalid topic. Must be 'general' or 'news'.)>"
  }
}
```

```
{
  "detail": {
    "error": "Unauthorized: missing or invalid API key."
  }
}
```

```
{
  "detail": [\
    {\
      "type": "string_type",\
      "loc": [\
        "body",\
        "query"\
      ],\
      "msg": "Input should be a valid string",\
      "input": []\
    }\
  ]
}
```

```
{
  "detail": {
    "error": "Your request has been blocked due to excessive requests. Please reduce the rate of requests."
  }
}
```

```
{
  "detail": {
    "error": "<432 Custom Forbidden Error (e.g This request exceeds your plan's set usage limit. Please upgrade your plan or contact support@tavily.com)>"
  }
}
```

```
{
  "detail": {
    "error": "This request exceeds the pay-as-you-go limit. You can increase your limit on the Tavily dashboard."
  }
}
```

```
{
  "detail": {
    "error": "Internal Server Error"
  }
}
```

POST

/

search

Python SDK

Python

```
from tavily import TavilyClient

tavily_client = TavilyClient(api_key="tvly-YOUR_API_KEY")
response = tavily_client.search("Who is Leo Messi?")

print(response)
```

```
const { tavily } = require("@tavily/core");

const tvly = tavily({ apiKey: "tvly-YOUR_API_KEY" });
const response = await tvly.search("Who is Leo Messi?");

console.log(response);
```

```
curl --request POST \
  --url https://api.tavily.com/search \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "query": "who is Leo Messi?",
  "search_depth": "basic",
  "chunks_per_source": 3,
  "max_results": 1,
  "topic": "general",
  "time_range": null,
  "start_date": "2025-02-09",
  "end_date": "2025-12-29",
  "include_published_date": false,
  "filter_by_published_date": false,
  "include_answer": false,
  "include_raw_content": false,
  "include_images": false,
  "include_image_descriptions": false,
  "include_favicon": false,
  "include_domains": [],
  "exclude_domains": [],
  "include_domains_mode": "restrict",
  "country": null,
  "language": "en",
  "filter_by_language": false,
  "auto_parameters": false,
  "exact_match": false,
  "include_usage": false,
  "safe_search": false
}
'
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [\
  CURLOPT_URL => "https://api.tavily.com/search",\
  CURLOPT_RETURNTRANSFER => true,\
  CURLOPT_ENCODING => "",\
  CURLOPT_MAXREDIRS => 10,\
  CURLOPT_TIMEOUT => 30,\
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\
  CURLOPT_CUSTOMREQUEST => "POST",\
  CURLOPT_POSTFIELDS => json_encode([\
    'query' => 'who is Leo Messi?',\
    'search_depth' => 'basic',\
    'chunks_per_source' => 3,\
    'max_results' => 1,\
    'topic' => 'general',\
    'time_range' => null,\
    'start_date' => '2025-02-09',\
    'end_date' => '2025-12-29',\
    'include_published_date' => false,\
    'filter_by_published_date' => false,\
    'include_answer' => false,\
    'include_raw_content' => false,\
    'include_images' => false,\
    'include_image_descriptions' => false,\
    'include_favicon' => false,\
    'include_domains' => [\
\
    ],\
    'exclude_domains' => [\
\
    ],\
    'include_domains_mode' => 'restrict',\
    'country' => null,\
    'language' => 'en',\
    'filter_by_language' => false,\
    'auto_parameters' => false,\
    'exact_match' => false,\
    'include_usage' => false,\
    'safe_search' => false\
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

	url := "https://api.tavily.com/search"

	payload := strings.NewReader("{\n  \"query\": \"who is Leo Messi?\",\n  \"search_depth\": \"basic\",\n  \"chunks_per_source\": 3,\n  \"max_results\": 1,\n  \"topic\": \"general\",\n  \"time_range\": null,\n  \"start_date\": \"2025-02-09\",\n  \"end_date\": \"2025-12-29\",\n  \"include_published_date\": false,\n  \"filter_by_published_date\": false,\n  \"include_answer\": false,\n  \"include_raw_content\": false,\n  \"include_images\": false,\n  \"include_image_descriptions\": false,\n  \"include_favicon\": false,\n  \"include_domains\": [],\n  \"exclude_domains\": [],\n  \"include_domains_mode\": \"restrict\",\n  \"country\": null,\n  \"language\": \"en\",\n  \"filter_by_language\": false,\n  \"auto_parameters\": false,\n  \"exact_match\": false,\n  \"include_usage\": false,\n  \"safe_search\": false\n}")

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
HttpResponse<String> response = Unirest.post("https://api.tavily.com/search")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"query\": \"who is Leo Messi?\",\n  \"search_depth\": \"basic\",\n  \"chunks_per_source\": 3,\n  \"max_results\": 1,\n  \"topic\": \"general\",\n  \"time_range\": null,\n  \"start_date\": \"2025-02-09\",\n  \"end_date\": \"2025-12-29\",\n  \"include_published_date\": false,\n  \"filter_by_published_date\": false,\n  \"include_answer\": false,\n  \"include_raw_content\": false,\n  \"include_images\": false,\n  \"include_image_descriptions\": false,\n  \"include_favicon\": false,\n  \"include_domains\": [],\n  \"exclude_domains\": [],\n  \"include_domains_mode\": \"restrict\",\n  \"country\": null,\n  \"language\": \"en\",\n  \"filter_by_language\": false,\n  \"auto_parameters\": false,\n  \"exact_match\": false,\n  \"include_usage\": false,\n  \"safe_search\": false\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.tavily.com/search")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"query\": \"who is Leo Messi?\",\n  \"search_depth\": \"basic\",\n  \"chunks_per_source\": 3,\n  \"max_results\": 1,\n  \"topic\": \"general\",\n  \"time_range\": null,\n  \"start_date\": \"2025-02-09\",\n  \"end_date\": \"2025-12-29\",\n  \"include_published_date\": false,\n  \"filter_by_published_date\": false,\n  \"include_answer\": false,\n  \"include_raw_content\": false,\n  \"include_images\": false,\n  \"include_image_descriptions\": false,\n  \"include_favicon\": false,\n  \"include_domains\": [],\n  \"exclude_domains\": [],\n  \"include_domains_mode\": \"restrict\",\n  \"country\": null,\n  \"language\": \"en\",\n  \"filter_by_language\": false,\n  \"auto_parameters\": false,\n  \"exact_match\": false,\n  \"include_usage\": false,\n  \"safe_search\": false\n}"

response = http.request(request)
puts response.read_body
```

200

400

401

422

429

432

433

500

```
{
  "query": "Who is Leo Messi?",
  "answer": "Lionel Messi, born in 1987, is an Argentine footballer widely regarded as one of the greatest players of his generation. He spent the majority of his career playing for FC Barcelona, where he won numerous domestic league titles and UEFA Champions League titles. Messi is known for his exceptional dribbling skills, vision, and goal-scoring ability. He has won multiple FIFA Ballon d'Or awards, numerous La Liga titles with Barcelona, and holds the record for most goals scored in a calendar year. In 2014, he led Argentina to the World Cup final, and in 2015, he helped Barcelona capture another treble. Despite turning 36 in June, Messi remains highly influential in the sport.",
  "images": [],
  "results": [\
    {\
      "title": "Lionel Messi Facts | Britannica",\
      "url": "https://www.britannica.com/facts/Lionel-Messi",\
      "content": "Lionel Messi, an Argentine footballer, is widely regarded as one of the greatest football players of his generation. Born in 1987, Messi spent the majority of his career playing for Barcelona, where he won numerous domestic league titles and UEFA Champions League titles. Messi is known for his exceptional dribbling skills, vision, and goal",\
      "score": 0.81025416,\
      "raw_content": null,\
      "published_date": "Tue, 11 Mar 2025 17:00:00 GMT",\
      "favicon": "https://britannica.com/favicon.png",\
      "images": [\
        {\
          "url": "<string>",\
          "description": "<string>"\
        }\
      ],\
      "id": "a3f9c2-04"\
    }\
  ],
  "response_time": "1.67",
  "auto_parameters": {
    "topic": "general",
    "search_depth": "basic"
  },
  "usage": {
    "credits": 1
  },
  "request_id": "123e4567-e89b-12d3-a456-426614174111"
}
```

```
{
  "detail": {
    "error": "<400 Bad Request, (e.g Invalid topic. Must be 'general' or 'news'.)>"
  }
}
```

```
{
  "detail": {
    "error": "Unauthorized: missing or invalid API key."
  }
}
```

```
{
  "detail": [\
    {\
      "type": "string_type",\
      "loc": [\
        "body",\
        "query"\
      ],\
      "msg": "Input should be a valid string",\
      "input": []\
    }\
  ]
}
```

```
{
  "detail": {
    "error": "Your request has been blocked due to excessive requests. Please reduce the rate of requests."
  }
}
```

```
{
  "detail": {
    "error": "<432 Custom Forbidden Error (e.g This request exceeds your plan's set usage limit. Please upgrade your plan or contact support@tavily.com)>"
  }
}
```

```
{
  "detail": {
    "error": "This request exceeds the pay-as-you-go limit. You can increase your limit on the Tavily dashboard."
  }
}
```

```
{
  "detail": {
    "error": "Internal Server Error"
  }
}
```

#### Authorizations

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#authorization-authorization)

Authorization

string

header

required

Bearer authentication header in the form Bearer , where  is your Tavily API key (e.g., Bearer tvly-YOUR\_API\_KEY).

#### Body

application/json

Parameters for the Tavily Search request.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-query)

query

string

required

The search query to execute with Tavily.

Example:

`"who is Leo Messi?"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-search-depth)

search\_depth

enum<string>

default:basic

Controls the latency vs. relevance tradeoff and how `results[].content` is generated:

- `advanced`: Highest relevance with increased latency. Best for detailed, high-precision queries. Returns multiple semantically relevant snippets per URL (configurable via `chunks_per_source`).
- `basic`: A balanced option for relevance and latency. Ideal for general-purpose searches. Returns multiple semantically relevant snippets per URL (configurable via `chunks_per_source`).
- `fast`: Prioritizes lower latency while maintaining good relevance. Returns multiple semantically relevant snippets per URL (configurable via `chunks_per_source`).
- `ultra-fast`: Minimizes latency above all else. Best for time-critical use cases. Returns one NLP summary per URL.

Cost:

- `basic`, `fast`, `ultra-fast`: 1 API Credit
- `advanced`: 2 API Credits

See [Search Best Practices](https://docs.tavily.com/documentation/best-practices/best-practices-search#search-depth) for guidance on choosing the right search depth.

Available options:

`advanced`,

`basic`,

`fast`,

`ultra-fast`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-chunks-per-source)

chunks\_per\_source

integer

default:3

Chunks are short content snippets (about 500 characters each for `basic` and `fast`, 800 for `advanced`) pulled directly from the source. Use `chunks_per_source` to define the maximum number of relevant chunks returned per source and to control the `content` length. Chunks will appear in the `content` field as: `<chunk 1> [...] <chunk 2> [...] <chunk 3>`. Adjacent chunks may be joined into one longer passage, so chunk length is a target, not a hard limit. Available when `search_depth` is `advanced`, `basic` or `fast`.

Required range: `1 <= x <= 3`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-max-results)

max\_results

integer

default:10

The maximum number of search results to return.

Required range: `0 <= x <= 20`

Example:

`1`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-topic)

topic

enum<string>

default:general

The category of the search.`news` is useful for retrieving real-time updates, particularly about politics, sports, and major current events covered by mainstream media sources. `general` is for broader, more general-purpose searches that may include a wide range of sources.

Available options:

`general`,

`news`,

`finance`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-time-range)

time\_range

enum<string>

The time range back from the current date to filter results based on publish date or last updated date. Useful when looking for sources that have published or updated data. By default, results with no detectable published date are not removed; set `filter_by_published_date` to `true` to remove them.

Available options:

`day`,

`week`,

`month`,

`year`,

`d`,

`w`,

`m`,

`y`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-start-date)

start\_date

string

Will return all results after the specified start date based on publish date or last updated date. Required to be written in the format YYYY-MM-DD. By default, results with no detectable published date are not removed; set `filter_by_published_date` to `true` to remove them.

Example:

`"2025-02-09"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-end-date)

end\_date

string

Will return all results before the specified end date based on publish date or last updated date. Required to be written in the format YYYY-MM-DD. By default, results with no detectable published date are not removed; set `filter_by_published_date` to `true` to remove them.

Example:

`"2025-12-29"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-published-date)

include\_published\_date

boolean

default:false

Include a `published_date` field in each result. The date is Tavily's best estimate of when the source was published or last updated, so it can be later than the original publish date. Results with no detectable date return `null`. Automatically enabled when `topic` is `news`.

Note: this feature is currently in beta.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-filter-by-published-date)

filter\_by\_published\_date

boolean

default:false

Remove results whose published date falls outside the `time_range`, `start_date`, or `end_date` window. Results with no detectable published date are also removed. Setting this to `true` also enables `include_published_date`.

If you want date-window filtering but don't want to lose sources without a detectable date, leave this `false` and set `include_published_date: true` together with a date range instead.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-answer-one-of-0)

include\_answer

booleanenum<string>booleanenum<string>

default:false

Include an LLM-generated answer to the provided query. `basic` or `true` returns a quick answer. `advanced` returns a more detailed answer.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-raw-content-one-of-0)

include\_raw\_content

booleanenum<string>booleanenum<string>

default:false

Include the cleaned and parsed HTML content of each search result. `markdown` or `true` returns search result content in markdown format. `text` returns the plain text from the results and may increase latency.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-images)

include\_images

boolean

default:false

Include images in the response. Returns both a top-level `images` list of query-related images and an `images` array inside each result object with images extracted from that specific source.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-image-descriptions)

include\_image\_descriptions

boolean

default:false

When `include_images` is `true`, also add a descriptive text for each image.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-favicon)

include\_favicon

boolean

default:false

Whether to include the favicon URL for each result.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-domains)

include\_domains

string\[\]

A list of domains to specifically include in the search results. Maximum 300 domains.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-exclude-domains)

exclude\_domains

string\[\]

A list of domains to specifically exclude from the search results. Maximum 150 domains.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-domains-mode)

include\_domains\_mode

enum<string>

default:restrict

Controls how `include_domains` is applied. `restrict` limits results to only the listed domains. `prefer` also searches the rest of the web, so results outside `include_domains` can still surface, rather than excluding them. Defaults to `restrict`, so `include_domains` acts as a hard filter unless set to `prefer`. Setting it without `include_domains` returns a 400 error.

Available options:

`restrict`,

`prefer`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-country)

country

enum<string>

Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is `general`.

Available options:

`afghanistan`,

`albania`,

`algeria`,

`andorra`,

`angola`,

`argentina`,

`armenia`,

`australia`,

`austria`,

`azerbaijan`,

`bahamas`,

`bahrain`,

`bangladesh`,

`barbados`,

`belarus`,

`belgium`,

`belize`,

`benin`,

`bhutan`,

`bolivia`,

`bosnia and herzegovina`,

`botswana`,

`brazil`,

`brunei`,

`bulgaria`,

`burkina faso`,

`burundi`,

`cambodia`,

`cameroon`,

`canada`,

`cape verde`,

`central african republic`,

`chad`,

`chile`,

`china`,

`colombia`,

`comoros`,

`congo`,

`costa rica`,

`croatia`,

`cuba`,

`cyprus`,

`czech republic`,

`denmark`,

`djibouti`,

`dominican republic`,

`ecuador`,

`egypt`,

`el salvador`,

`equatorial guinea`,

`eritrea`,

`estonia`,

`ethiopia`,

`fiji`,

`finland`,

`france`,

`gabon`,

`gambia`,

`georgia`,

`germany`,

`ghana`,

`greece`,

`guatemala`,

`guinea`,

`haiti`,

`honduras`,

`hungary`,

`iceland`,

`india`,

`indonesia`,

`iran`,

`iraq`,

`ireland`,

`israel`,

`italy`,

`jamaica`,

`japan`,

`jordan`,

`kazakhstan`,

`kenya`,

`kuwait`,

`kyrgyzstan`,

`latvia`,

`lebanon`,

`lesotho`,

`liberia`,

`libya`,

`liechtenstein`,

`lithuania`,

`luxembourg`,

`madagascar`,

`malawi`,

`malaysia`,

`maldives`,

`mali`,

`malta`,

`mauritania`,

`mauritius`,

`mexico`,

`moldova`,

`monaco`,

`mongolia`,

`montenegro`,

`morocco`,

`mozambique`,

`myanmar`,

`namibia`,

`nepal`,

`netherlands`,

`new zealand`,

`nicaragua`,

`niger`,

`nigeria`,

`north korea`,

`north macedonia`,

`norway`,

`oman`,

`pakistan`,

`panama`,

`papua new guinea`,

`paraguay`,

`peru`,

`philippines`,

`poland`,

`portugal`,

`qatar`,

`romania`,

`russia`,

`rwanda`,

`saudi arabia`,

`senegal`,

`serbia`,

`singapore`,

`slovakia`,

`slovenia`,

`somalia`,

`south africa`,

`south korea`,

`south sudan`,

`spain`,

`sri lanka`,

`sudan`,

`sweden`,

`switzerland`,

`syria`,

`taiwan`,

`tajikistan`,

`tanzania`,

`thailand`,

`togo`,

`trinidad and tobago`,

`tunisia`,

`turkey`,

`turkmenistan`,

`uganda`,

`ukraine`,

`united arab emirates`,

`united kingdom`,

`united states`,

`uruguay`,

`uzbekistan`,

`venezuela`,

`vietnam`,

`yemen`,

`zambia`,

`zimbabwe`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-language)

language

string

Boost search results in a specific language. Accepts an ISO 639-1 code (e.g. `en`, `fr`, `zh-cn`) or an English language name (e.g. `english`, `french`). By default this only boosts matching-language results in ranking; pass `filter_by_language: true` to strictly filter out non-matching results instead. For best results, write your `query` in the same language you set here.

Example:

`"en"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-filter-by-language)

filter\_by\_language

boolean

default:false

Strictly filter out search results that don't match the `language` parameter, instead of only boosting them in ranking. Requires `language` to be set; returns a 400 error otherwise.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-auto-parameters)

auto\_parameters

boolean

default:false

When `auto_parameters` is enabled, Tavily automatically configures search parameters based on your query's content and intent. You can still set other parameters manually, and your explicit values will override the automatic ones. The parameters `include_answer`, `include_raw_content`, and `max_results` must always be set manually, as they directly affect response size. Note: `search_depth` may be automatically set to advanced when it's likely to improve results. This uses 2 API credits per request. To avoid the extra cost, you can explicitly set `search_depth` to `basic`.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-exact-match)

exact\_match

boolean

default:false

Ensure that only search results containing the exact quoted phrase(s) in the query are returned, bypassing synonyms or semantic variations. Wrap target phrases in quotes within your query (e.g. `"John Smith" CEO Acme Corp`). Punctuation is typically ignored inside quotes.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-include-usage)

include\_usage

boolean

default:false

Whether to include credit usage information in the response.

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#body-safe-search)

safe\_search

boolean

default:false

Whether to filter out adult or unsafe content from results. Not supported for `fast` or `ultra-fast` search depths.

#### Response

200

application/json

Search results returned successfully

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-query)

query

string

required

The search query that was executed.

Example:

`"Who is Leo Messi?"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-answer)

answer

string

required

A short answer to the user's query, generated by an LLM. Included in the response only if `include_answer` is requested (i.e., set to `true`, `basic`, or `advanced`)

Example:

`"Lionel Messi, born in 1987, is an Argentine footballer widely regarded as one of the greatest players of his generation. He spent the majority of his career playing for FC Barcelona, where he won numerous domestic league titles and UEFA Champions League titles. Messi is known for his exceptional dribbling skills, vision, and goal-scoring ability. He has won multiple FIFA Ballon d'Or awards, numerous La Liga titles with Barcelona, and holds the record for most goals scored in a calendar year. In 2014, he led Argentina to the World Cup final, and in 2015, he helped Barcelona capture another treble. Despite turning 36 in June, Messi remains highly influential in the sport."`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-images)

images

object\[\]

required

A list of query-related images from image search. If `include_image_descriptions` is true, each item will have `url` and `description`. Note: per-result images are also returned inside each result object's `images` field.

Showchild attributes

Example:

```
[]
```

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-results)

results

object\[\]

required

A list of sorted search results, ranked by relevancy.

Showchild attributes

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-response-time)

response\_time

number<float>

required

Time in seconds it took to complete the request.

Example:

`"1.67"`

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-auto-parameters)

auto\_parameters

object

A dictionary of the selected auto\_parameters, only shown when `auto_parameters` is true.

Example:

```
{
  "topic": "general",
  "search_depth": "basic"
}
```

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-usage)

usage

object

Credit usage details for the request.

Example:

```
{ "credits": 1 }
```

[​](https://docs.tavily.com/documentation/api-reference/endpoint/search#response-request-id)

request\_id

string

A unique request identifier you can share with customer support to help resolve issues with specific requests.

Example:

`"123e4567-e89b-12d3-a456-426614174111"`

Assistant

Responses are generated using AI and may contain mistakes.