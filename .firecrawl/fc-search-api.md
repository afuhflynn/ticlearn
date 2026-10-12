> ## Documentation Index
>
> Fetch the complete documentation index at: [/llms.txt](https://docs.firecrawl.dev/llms.txt)
>
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.firecrawl.dev/api-reference/endpoint/search#content-area)

Search and optionally scrape search results

cURL

```
curl --request POST \
  --url https://api.firecrawl.dev/v2/search \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "query": "<string>",
  "limit": 10,
  "sources": [\
    "web"\
  ],
  "domainTools": true,
  "toolDetail": "compact",
  "categories": [\
    {\
      "type": "developer"\
    }\
  ],
  "includeDomains": [\
    "<string>"\
  ],
  "excludeDomains": [\
    "<string>"\
  ],
  "tbs": "<string>",
  "location": "<string>",
  "country": "US",
  "safe": true,
  "timeout": 60000,
  "ignoreInvalidURLs": false,
  "highlights": true,
  "enterprise": [],
  "scrapeOptions": {},
  "threatProtection": {
    "riskScoreThreshold": 75,
    "blacklist": [\
      "<string>"\
    ],
    "whitelist": [\
      "<string>"\
    ],
    "blockedTlds": [\
      "<string>"\
    ]
  }
}
'
```

```
import requests

url = "https://api.firecrawl.dev/v2/search"

payload = {
    "query": "<string>",
    "limit": 10,
    "sources": ["web"],
    "domainTools": True,
    "toolDetail": "compact",
    "categories": [{ "type": "developer" }],
    "includeDomains": ["<string>"],
    "excludeDomains": ["<string>"],
    "tbs": "<string>",
    "location": "<string>",
    "country": "US",
    "safe": True,
    "timeout": 60000,
    "ignoreInvalidURLs": False,
    "highlights": True,
    "enterprise": [],
    "scrapeOptions": {},
    "threatProtection": {
        "riskScoreThreshold": 75,
        "blacklist": ["<string>"],
        "whitelist": ["<string>"],
        "blockedTlds": ["<string>"]
    }
}
headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.text)
```

```
const options = {
  method: 'POST',
  headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: '<string>',
    limit: 10,
    sources: ['web'],
    domainTools: true,
    toolDetail: 'compact',
    categories: [{type: 'developer'}],
    includeDomains: ['<string>'],
    excludeDomains: ['<string>'],
    tbs: '<string>',
    location: '<string>',
    country: 'US',
    safe: true,
    timeout: 60000,
    ignoreInvalidURLs: false,
    highlights: true,
    enterprise: [],
    scrapeOptions: {},
    threatProtection: {
      riskScoreThreshold: 75,
      blacklist: ['<string>'],
      whitelist: ['<string>'],
      blockedTlds: ['<string>']
    }
  })
};

fetch('https://api.firecrawl.dev/v2/search', options)
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.error(err));
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [\
  CURLOPT_URL => "https://api.firecrawl.dev/v2/search",\
  CURLOPT_RETURNTRANSFER => true,\
  CURLOPT_ENCODING => "",\
  CURLOPT_MAXREDIRS => 10,\
  CURLOPT_TIMEOUT => 30,\
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\
  CURLOPT_CUSTOMREQUEST => "POST",\
  CURLOPT_POSTFIELDS => json_encode([\
    'query' => '<string>',\
    'limit' => 10,\
    'sources' => [\
        'web'\
    ],\
    'domainTools' => true,\
    'toolDetail' => 'compact',\
    'categories' => [\
        [\
                'type' => 'developer'\
        ]\
    ],\
    'includeDomains' => [\
        '<string>'\
    ],\
    'excludeDomains' => [\
        '<string>'\
    ],\
    'tbs' => '<string>',\
    'location' => '<string>',\
    'country' => 'US',\
    'safe' => true,\
    'timeout' => 60000,\
    'ignoreInvalidURLs' => false,\
    'highlights' => true,\
    'enterprise' => [\
\
    ],\
    'scrapeOptions' => [\
\
    ],\
    'threatProtection' => [\
        'riskScoreThreshold' => 75,\
        'blacklist' => [\
                '<string>'\
        ],\
        'whitelist' => [\
                '<string>'\
        ],\
        'blockedTlds' => [\
                '<string>'\
        ]\
    ]\
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

	url := "https://api.firecrawl.dev/v2/search"

	payload := strings.NewReader("{\n  \"query\": \"<string>\",\n  \"limit\": 10,\n  \"sources\": [\n    \"web\"\n  ],\n  \"domainTools\": true,\n  \"toolDetail\": \"compact\",\n  \"categories\": [\n    {\n      \"type\": \"developer\"\n    }\n  ],\n  \"includeDomains\": [\n    \"<string>\"\n  ],\n  \"excludeDomains\": [\n    \"<string>\"\n  ],\n  \"tbs\": \"<string>\",\n  \"location\": \"<string>\",\n  \"country\": \"US\",\n  \"safe\": true,\n  \"timeout\": 60000,\n  \"ignoreInvalidURLs\": false,\n  \"highlights\": true,\n  \"enterprise\": [],\n  \"scrapeOptions\": {},\n  \"threatProtection\": {\n    \"riskScoreThreshold\": 75,\n    \"blacklist\": [\n      \"<string>\"\n    ],\n    \"whitelist\": [\n      \"<string>\"\n    ],\n    \"blockedTlds\": [\n      \"<string>\"\n    ]\n  }\n}")

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
HttpResponse<String> response = Unirest.post("https://api.firecrawl.dev/v2/search")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"query\": \"<string>\",\n  \"limit\": 10,\n  \"sources\": [\n    \"web\"\n  ],\n  \"domainTools\": true,\n  \"toolDetail\": \"compact\",\n  \"categories\": [\n    {\n      \"type\": \"developer\"\n    }\n  ],\n  \"includeDomains\": [\n    \"<string>\"\n  ],\n  \"excludeDomains\": [\n    \"<string>\"\n  ],\n  \"tbs\": \"<string>\",\n  \"location\": \"<string>\",\n  \"country\": \"US\",\n  \"safe\": true,\n  \"timeout\": 60000,\n  \"ignoreInvalidURLs\": false,\n  \"highlights\": true,\n  \"enterprise\": [],\n  \"scrapeOptions\": {},\n  \"threatProtection\": {\n    \"riskScoreThreshold\": 75,\n    \"blacklist\": [\n      \"<string>\"\n    ],\n    \"whitelist\": [\n      \"<string>\"\n    ],\n    \"blockedTlds\": [\n      \"<string>\"\n    ]\n  }\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.firecrawl.dev/v2/search")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"query\": \"<string>\",\n  \"limit\": 10,\n  \"sources\": [\n    \"web\"\n  ],\n  \"domainTools\": true,\n  \"toolDetail\": \"compact\",\n  \"categories\": [\n    {\n      \"type\": \"developer\"\n    }\n  ],\n  \"includeDomains\": [\n    \"<string>\"\n  ],\n  \"excludeDomains\": [\n    \"<string>\"\n  ],\n  \"tbs\": \"<string>\",\n  \"location\": \"<string>\",\n  \"country\": \"US\",\n  \"safe\": true,\n  \"timeout\": 60000,\n  \"ignoreInvalidURLs\": false,\n  \"highlights\": true,\n  \"enterprise\": [],\n  \"scrapeOptions\": {},\n  \"threatProtection\": {\n    \"riskScoreThreshold\": 75,\n    \"blacklist\": [\n      \"<string>\"\n    ],\n    \"whitelist\": [\n      \"<string>\"\n    ],\n    \"blockedTlds\": [\n      \"<string>\"\n    ]\n  }\n}"

response = http.request(request)
puts response.read_body
```

200

408

500

```
{
  "success": true,
  "data": {
    "web": [\
      {\
        "title": "<string>",\
        "description": "<string>",\
        "url": "<string>",\
        "markdown": "<string>",\
        "html": "<string>",\
        "rawHtml": "<string>",\
        "links": [\
          "<string>"\
        ],\
        "screenshot": "<string>",\
        "audio": "<string>",\
        "video": "<string>",\
        "metadata": {\
          "title": "<string>",\
          "description": "<string>",\
          "sourceURL": "<string>",\
          "url": "<string>",\
          "statusCode": 123,\
          "numPages": 123,\
          "totalPages": 123,\
          "error": "<string>"\
        }\
      }\
    ],
    "images": [\
      {\
        "title": "<string>",\
        "imageUrl": "<string>",\
        "imageWidth": 123,\
        "imageHeight": 123,\
        "url": "<string>",\
        "position": 123\
      }\
    ],
    "news": [\
      {\
        "title": "<string>",\
        "snippet": "<string>",\
        "url": "<string>",\
        "date": "<string>",\
        "imageUrl": "<string>",\
        "position": 123,\
        "markdown": "<string>",\
        "html": "<string>",\
        "rawHtml": "<string>",\
        "links": [\
          "<string>"\
        ],\
        "screenshot": "<string>",\
        "audio": "<string>",\
        "video": "<string>",\
        "metadata": {\
          "title": "<string>",\
          "description": "<string>",\
          "sourceURL": "<string>",\
          "url": "<string>",\
          "statusCode": 123,\
          "numPages": 123,\
          "totalPages": 123,\
          "error": "<string>"\
        }\
      }\
    ],
    "tools": [\
      {\
        "provider": "<string>",\
        "capability": "<string>",\
        "description": "<string>",\
        "id": "<string>",\
        "name": "<string>",\
        "creditsCost": 1,\
        "perRecord": true,\
        "options": [\
          {\
            "name": "<string>",\
            "type": "<string>"\
          }\
        ],\
        "response": {\
          "about": "<string>",\
          "key": "<string>",\
          "fields": [\
            {}\
          ]\
        },\
        "matchedBy": [\
          "semantic"\
        ],\
        "matchedUrls": [\
          "<string>"\
        ]\
      }\
    ]
  },
  "warning": "<string>",
  "id": "<string>",
  "creditsUsed": 123
}
```

```
{
  "success": false,
  "error": "Request timed out"
}
```

```
{
  "success": false,
  "code": "UNKNOWN_ERROR",
  "error": "An unexpected error occurred on the server."
}
```

POST

/

search

Try it

Search and optionally scrape search results

cURL

```
curl --request POST \
  --url https://api.firecrawl.dev/v2/search \
  --header 'Authorization: Bearer <token>' \
  --header 'Content-Type: application/json' \
  --data '
{
  "query": "<string>",
  "limit": 10,
  "sources": [\
    "web"\
  ],
  "domainTools": true,
  "toolDetail": "compact",
  "categories": [\
    {\
      "type": "developer"\
    }\
  ],
  "includeDomains": [\
    "<string>"\
  ],
  "excludeDomains": [\
    "<string>"\
  ],
  "tbs": "<string>",
  "location": "<string>",
  "country": "US",
  "safe": true,
  "timeout": 60000,
  "ignoreInvalidURLs": false,
  "highlights": true,
  "enterprise": [],
  "scrapeOptions": {},
  "threatProtection": {
    "riskScoreThreshold": 75,
    "blacklist": [\
      "<string>"\
    ],
    "whitelist": [\
      "<string>"\
    ],
    "blockedTlds": [\
      "<string>"\
    ]
  }
}
'
```

```
import requests

url = "https://api.firecrawl.dev/v2/search"

payload = {
    "query": "<string>",
    "limit": 10,
    "sources": ["web"],
    "domainTools": True,
    "toolDetail": "compact",
    "categories": [{ "type": "developer" }],
    "includeDomains": ["<string>"],
    "excludeDomains": ["<string>"],
    "tbs": "<string>",
    "location": "<string>",
    "country": "US",
    "safe": True,
    "timeout": 60000,
    "ignoreInvalidURLs": False,
    "highlights": True,
    "enterprise": [],
    "scrapeOptions": {},
    "threatProtection": {
        "riskScoreThreshold": 75,
        "blacklist": ["<string>"],
        "whitelist": ["<string>"],
        "blockedTlds": ["<string>"]
    }
}
headers = {
    "Authorization": "Bearer <token>",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)

print(response.text)
```

```
const options = {
  method: 'POST',
  headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
  body: JSON.stringify({
    query: '<string>',
    limit: 10,
    sources: ['web'],
    domainTools: true,
    toolDetail: 'compact',
    categories: [{type: 'developer'}],
    includeDomains: ['<string>'],
    excludeDomains: ['<string>'],
    tbs: '<string>',
    location: '<string>',
    country: 'US',
    safe: true,
    timeout: 60000,
    ignoreInvalidURLs: false,
    highlights: true,
    enterprise: [],
    scrapeOptions: {},
    threatProtection: {
      riskScoreThreshold: 75,
      blacklist: ['<string>'],
      whitelist: ['<string>'],
      blockedTlds: ['<string>']
    }
  })
};

fetch('https://api.firecrawl.dev/v2/search', options)
  .then(res => res.json())
  .then(res => console.log(res))
  .catch(err => console.error(err));
```

```
<?php

$curl = curl_init();

curl_setopt_array($curl, [\
  CURLOPT_URL => "https://api.firecrawl.dev/v2/search",\
  CURLOPT_RETURNTRANSFER => true,\
  CURLOPT_ENCODING => "",\
  CURLOPT_MAXREDIRS => 10,\
  CURLOPT_TIMEOUT => 30,\
  CURLOPT_HTTP_VERSION => CURL_HTTP_VERSION_1_1,\
  CURLOPT_CUSTOMREQUEST => "POST",\
  CURLOPT_POSTFIELDS => json_encode([\
    'query' => '<string>',\
    'limit' => 10,\
    'sources' => [\
        'web'\
    ],\
    'domainTools' => true,\
    'toolDetail' => 'compact',\
    'categories' => [\
        [\
                'type' => 'developer'\
        ]\
    ],\
    'includeDomains' => [\
        '<string>'\
    ],\
    'excludeDomains' => [\
        '<string>'\
    ],\
    'tbs' => '<string>',\
    'location' => '<string>',\
    'country' => 'US',\
    'safe' => true,\
    'timeout' => 60000,\
    'ignoreInvalidURLs' => false,\
    'highlights' => true,\
    'enterprise' => [\
\
    ],\
    'scrapeOptions' => [\
\
    ],\
    'threatProtection' => [\
        'riskScoreThreshold' => 75,\
        'blacklist' => [\
                '<string>'\
        ],\
        'whitelist' => [\
                '<string>'\
        ],\
        'blockedTlds' => [\
                '<string>'\
        ]\
    ]\
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

	url := "https://api.firecrawl.dev/v2/search"

	payload := strings.NewReader("{\n  \"query\": \"<string>\",\n  \"limit\": 10,\n  \"sources\": [\n    \"web\"\n  ],\n  \"domainTools\": true,\n  \"toolDetail\": \"compact\",\n  \"categories\": [\n    {\n      \"type\": \"developer\"\n    }\n  ],\n  \"includeDomains\": [\n    \"<string>\"\n  ],\n  \"excludeDomains\": [\n    \"<string>\"\n  ],\n  \"tbs\": \"<string>\",\n  \"location\": \"<string>\",\n  \"country\": \"US\",\n  \"safe\": true,\n  \"timeout\": 60000,\n  \"ignoreInvalidURLs\": false,\n  \"highlights\": true,\n  \"enterprise\": [],\n  \"scrapeOptions\": {},\n  \"threatProtection\": {\n    \"riskScoreThreshold\": 75,\n    \"blacklist\": [\n      \"<string>\"\n    ],\n    \"whitelist\": [\n      \"<string>\"\n    ],\n    \"blockedTlds\": [\n      \"<string>\"\n    ]\n  }\n}")

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
HttpResponse<String> response = Unirest.post("https://api.firecrawl.dev/v2/search")
  .header("Authorization", "Bearer <token>")
  .header("Content-Type", "application/json")
  .body("{\n  \"query\": \"<string>\",\n  \"limit\": 10,\n  \"sources\": [\n    \"web\"\n  ],\n  \"domainTools\": true,\n  \"toolDetail\": \"compact\",\n  \"categories\": [\n    {\n      \"type\": \"developer\"\n    }\n  ],\n  \"includeDomains\": [\n    \"<string>\"\n  ],\n  \"excludeDomains\": [\n    \"<string>\"\n  ],\n  \"tbs\": \"<string>\",\n  \"location\": \"<string>\",\n  \"country\": \"US\",\n  \"safe\": true,\n  \"timeout\": 60000,\n  \"ignoreInvalidURLs\": false,\n  \"highlights\": true,\n  \"enterprise\": [],\n  \"scrapeOptions\": {},\n  \"threatProtection\": {\n    \"riskScoreThreshold\": 75,\n    \"blacklist\": [\n      \"<string>\"\n    ],\n    \"whitelist\": [\n      \"<string>\"\n    ],\n    \"blockedTlds\": [\n      \"<string>\"\n    ]\n  }\n}")
  .asString();
```

```
require 'uri'
require 'net/http'

url = URI("https://api.firecrawl.dev/v2/search")

http = Net::HTTP.new(url.host, url.port)
http.use_ssl = true

request = Net::HTTP::Post.new(url)
request["Authorization"] = 'Bearer <token>'
request["Content-Type"] = 'application/json'
request.body = "{\n  \"query\": \"<string>\",\n  \"limit\": 10,\n  \"sources\": [\n    \"web\"\n  ],\n  \"domainTools\": true,\n  \"toolDetail\": \"compact\",\n  \"categories\": [\n    {\n      \"type\": \"developer\"\n    }\n  ],\n  \"includeDomains\": [\n    \"<string>\"\n  ],\n  \"excludeDomains\": [\n    \"<string>\"\n  ],\n  \"tbs\": \"<string>\",\n  \"location\": \"<string>\",\n  \"country\": \"US\",\n  \"safe\": true,\n  \"timeout\": 60000,\n  \"ignoreInvalidURLs\": false,\n  \"highlights\": true,\n  \"enterprise\": [],\n  \"scrapeOptions\": {},\n  \"threatProtection\": {\n    \"riskScoreThreshold\": 75,\n    \"blacklist\": [\n      \"<string>\"\n    ],\n    \"whitelist\": [\n      \"<string>\"\n    ],\n    \"blockedTlds\": [\n      \"<string>\"\n    ]\n  }\n}"

response = http.request(request)
puts response.read_body
```

200

408

500

```
{
  "success": true,
  "data": {
    "web": [\
      {\
        "title": "<string>",\
        "description": "<string>",\
        "url": "<string>",\
        "markdown": "<string>",\
        "html": "<string>",\
        "rawHtml": "<string>",\
        "links": [\
          "<string>"\
        ],\
        "screenshot": "<string>",\
        "audio": "<string>",\
        "video": "<string>",\
        "metadata": {\
          "title": "<string>",\
          "description": "<string>",\
          "sourceURL": "<string>",\
          "url": "<string>",\
          "statusCode": 123,\
          "numPages": 123,\
          "totalPages": 123,\
          "error": "<string>"\
        }\
      }\
    ],
    "images": [\
      {\
        "title": "<string>",\
        "imageUrl": "<string>",\
        "imageWidth": 123,\
        "imageHeight": 123,\
        "url": "<string>",\
        "position": 123\
      }\
    ],
    "news": [\
      {\
        "title": "<string>",\
        "snippet": "<string>",\
        "url": "<string>",\
        "date": "<string>",\
        "imageUrl": "<string>",\
        "position": 123,\
        "markdown": "<string>",\
        "html": "<string>",\
        "rawHtml": "<string>",\
        "links": [\
          "<string>"\
        ],\
        "screenshot": "<string>",\
        "audio": "<string>",\
        "video": "<string>",\
        "metadata": {\
          "title": "<string>",\
          "description": "<string>",\
          "sourceURL": "<string>",\
          "url": "<string>",\
          "statusCode": 123,\
          "numPages": 123,\
          "totalPages": 123,\
          "error": "<string>"\
        }\
      }\
    ],
    "tools": [\
      {\
        "provider": "<string>",\
        "capability": "<string>",\
        "description": "<string>",\
        "id": "<string>",\
        "name": "<string>",\
        "creditsCost": 1,\
        "perRecord": true,\
        "options": [\
          {\
            "name": "<string>",\
            "type": "<string>"\
          }\
        ],\
        "response": {\
          "about": "<string>",\
          "key": "<string>",\
          "fields": [\
            {}\
          ]\
        },\
        "matchedBy": [\
          "semantic"\
        ],\
        "matchedUrls": [\
          "<string>"\
        ]\
      }\
    ]
  },
  "warning": "<string>",
  "id": "<string>",
  "creditsUsed": 123
}
```

```
{
  "success": false,
  "error": "Request timed out"
}
```

```
{
  "success": false,
  "code": "UNKNOWN_ERROR",
  "error": "An unexpected error occurred on the server."
}
```

The search endpoint combines web search with Firecrawl’s scraping capabilities to return full page content for any query.Include `scrapeOptions` with `formats: [{"type": "markdown"}]` to get complete markdown content for each search result otherwise you will default to getting the results (url, title, description). You can also use other formats like `{"type": "summary"}` for condensed content.

## [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#supported-query-operators)  Supported query operators

We support a variety of query operators that allow you to filter your searches better.

| Operator | Functionality | Examples |
| --- | --- | --- |
| `""` | Non-fuzzy matches a string of text | `"Firecrawl"` |
| `-` | Excludes certain keywords or negates other operators | `-bad`, `-site:firecrawl.dev` |
| `site:` | Only returns results from a specified website | `site:firecrawl.dev` |
| `filetype:` | Only returns results with a specific file extension | `filetype:pdf`, `-filetype:pdf` |
| `inurl:` | Only returns results that include a word in the URL | `inurl:firecrawl` |
| `allinurl:` | Only returns results that include multiple words in the URL | `allinurl:git firecrawl` |
| `intitle:` | Only returns results that include a word in the title of the page | `intitle:Firecrawl` |
| `allintitle:` | Only returns results that include multiple words in the title of the page | `allintitle:firecrawl playground` |
| `related:` | Only returns results that are related to a specific domain | `related:firecrawl.dev` |
| `imagesize:` | Only returns images with exact dimensions | `imagesize:1920x1080` |
| `larger:` | Only returns images larger than specified dimensions | `larger:1920x1080` |

## [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#location-parameter)  Location Parameter

Use the `location` parameter to get geo-targeted search results. Format: `"string"`. Examples: `"Germany"`, `"San Francisco,California,United States"`.See the [complete list of supported locations](https://firecrawl.dev/search_locations.json) for all available countries and languages.

## [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#country-parameter)  Country Parameter

Use the `country` parameter to specify the country for search results using ISO country codes. Default: `"US"`.Examples: `"US"`, `"DE"`, `"FR"`, `"JP"`, `"UK"`, `"CA"`.

```
{
  "query": "restaurants",
  "country": "DE"
}
```

## [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#categories-parameter)  Categories Parameter

Filter search results by specific categories using the `categories` parameter:

- **`research`**: Restrict web search to academic and research websites (arxiv.org, nature.com, pubmed.ncbi.nlm.nih.gov, and similar). Changes on 2026-11-16 to search the [Research Index](https://docs.firecrawl.dev/features/research) and return paper records, see the warning below
- **`pdf`**: Search for PDFs
- **`developer`**: Search the [Developer Index](https://docs.firecrawl.dev/features/developer) — issues, merged pull requests, and READMEs from public code repositories, alongside curated documentation sites
- **`gov`**: Search the [Firecrawl Government Index](https://docs.firecrawl.dev/features/gov) — statutes, regulations, codes, court opinions, and other government publications. Cannot be combined with other categories

**The `research` category changes on 2026-11-16.** It will search the [Research Index](https://docs.firecrawl.dev/features/research) (PubMed, bioRxiv, medRxiv, arXiv) instead of filtering web results to 14 academic websites. Results will move from `data.web` to `data.research` and come back as paper records: `paperId`, `primaryId`, `ids`, `title`, `abstract`, `score`. Until then every response that uses it carries a `warnings` entry.If you want paper records, update your parsing before that date or call [`GET /search/research/papers`](https://docs.firecrawl.dev/api-reference/endpoint/research-search-papers) today. If you want web pages from academic sites, switch to [`includeDomains`](https://docs.firecrawl.dev/api-reference/endpoint/search#domain-filters).

### [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#example-usage)  Example Usage

```
{
  "query": "machine learning",
  "categories": ["research", "pdf"],
  "limit": 10
}
```

## [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#domain-filters)  Domain Filters

Use `includeDomains` to restrict results to specific domains, or `excludeDomains` to remove specific domains from the search. Domains should be hostnames only, without protocol or path.`includeDomains` and `excludeDomains` are mutually exclusive.

### [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#include-domains-example)  Include Domains Example

```
{
  "query": "web scraping",
  "includeDomains": ["firecrawl.dev", "docs.firecrawl.dev"],
  "limit": 10
}
```

### [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#exclude-domains-example)  Exclude Domains Example

```
{
  "query": "web scraping tools",
  "excludeDomains": ["example.com"],
  "limit": 10
}
```

### [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#category-response)  Category Response

Each result includes a `category` field indicating its source:

```
{
  "success": true,
  "data": {
    "web": [\
      {\
        "url": "https://arxiv.org/abs/2024.12345",\
        "title": "ML Research Paper",\
        "description": "Latest advances in machine learning",\
        "category": "research"\
      },\
      {\
        "url": "https://example.com/ml-survey.pdf",\
        "title": "ML Survey",\
        "description": "A survey of machine learning methods",\
        "category": "pdf"\
      }\
    ]
  }
}
```

## [​](https://docs.firecrawl.dev/api-reference/endpoint/search\#time-based-search)  Time-Based Search

Use the `tbs` parameter to filter results by time periods, including custom date ranges. See the [Search Feature documentation](https://docs.firecrawl.dev/features/search#time-based-search) for detailed examples and supported formats.

> Are you an AI agent that needs a Firecrawl API key? See [firecrawl.dev/agent-onboarding/SKILL.md](https://www.firecrawl.dev/agent-onboarding/SKILL.md) for automated onboarding instructions.

#### Authorizations

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#authorization-authorization)

Authorization

string

header

required

Bearer authentication header of the form `Bearer <token>`, where `<token>` is your auth token.

#### Body

application/json

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-query)

query

string

required

The search query

Maximum string length: `500`

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-limit)

limit

integer

default:10

Maximum number of results to return (per source type when using multiple sources)

Required range: `1 <= x <= 100`

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-sources)

sources

(Web · object \| Images · object \| News · object \| Alexandria · object)\[\]

Sources to search. Will determine the arrays available in the response. Defaults to \['web'\]. The plain string form (e.g. `["web", "alexandria"]`) is also accepted. The `alexandria` source returns tool contracts discovered from the Alexandria catalogue in `data.tools` instead of search results; it is free and is never counted in `creditsUsed`. Requires the team's Alexandria access to be enabled (403 otherwise).

- Web

- Images

- News

- Alexandria


Showchild attributes

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-domain-tools)

domainTools

boolean

Include tool contracts whose provider matches the domains of the returned web results. Defaults to on when `alexandria` is among the sources; set `false` to disable, or `true` alone to add domain-matched tools beside ordinary web results. Free.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-tool-detail)

toolDetail

enum<string>

default:compact

How much of each tool contract to return in `data.tools`. `compact` returns only `provider`, `capability`, and `description`. `summary` returns the full tool entry without `options` and `response`. `full` also returns `options`, `response`, and `examples`.

Available options:

`compact`,

`summary`,

`full`

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-categories)

categories

(Developer · object \| Gov · object \| Research · object \| PDF · object)\[\]

Categories to filter results by. Defaults to \[\], which means results will not be filtered by any categories.

- Developer

- Gov

- Research

- PDF


Showchild attributes

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-include-domains)

includeDomains

string<hostname>\[\]

Restricts search results to the specified domains. Domains should be hostnames only, without protocol or path. Cannot be used with excludeDomains.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-exclude-domains)

excludeDomains

string<hostname>\[\]

Excludes search results from the specified domains. Domains should be hostnames only, without protocol or path. Cannot be used with includeDomains.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-tbs)

tbs

string

Time-based search parameter. Supports predefined time ranges (`qdr:h`, `qdr:d`, `qdr:w`, `qdr:m`, `qdr:y`), custom date ranges (`cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY`), and sort by date (`sbd:1`). Values can be combined, e.g. `sbd:1,qdr:w`.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-location)

location

string

Location parameter for search results (e.g. `San Francisco,California,United States`). For best results, set both this and the `country` parameter.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-country)

country

string

default:US

ISO country code for geo-targeting search results (e.g. `US`). For best results, set both this and the `location` parameter.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-safe)

safe

boolean

When `true`, filters explicit content from search results (SafeSearch). Omit to keep the default behavior, which does not apply the filter.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-timeout)

timeout

integer

default:60000

Timeout in milliseconds

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-ignore-invalid-urls)

ignoreInvalidURLs

boolean

default:false

Excludes URLs from the search results that are invalid for other Firecrawl endpoints. This helps reduce errors if you are piping data from search into other Firecrawl API endpoints.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-highlights)

highlights

boolean

default:true

Generate query-relevant highlights for search results. Set to false to return provider descriptions or snippets without highlighting.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-enterprise)

enterprise

enum<string>\[\]

Enterprise search options for Zero Data Retention (ZDR). Use `["zdr"]` for end-to-end ZDR (10 credits / 10 results) or `["anon"]` for anonymized ZDR (2 credits / 10 results). Must be enabled for your team.

Available options:

`anon`,

`zdr`

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-scrape-options)

scrapeOptions

object

Options for scraping search results

Showchild attributes

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#body-threat-protection)

threatProtection

Threat Protection Override · object

Per-request [Threat Protection](https://docs.firecrawl.dev/features/threat-protection) override. Fields you provide replace the corresponding fields of your organization's policy for this request only; omitted fields keep their organization-level values. Requires Threat Protection to be enabled for your team (enterprise feature) — otherwise the request is rejected with a 403. If your organization has disabled request overrides, any request that includes this object is rejected with a 403. If Threat Protection is enforced for your team, `mode` may not be set to `off`.

Showchild attributes

#### Response

200

application/json

Successful response

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#response-success)

success

boolean

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#response-data)

data

object

The search results. The arrays available will depend on the sources you specified in the request. By default, the `web` array will be returned.

Showchild attributes

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#response-warning-one-of-0)

warning

string \| null

Warning message if any issues occurred. Includes `Some tool discovery results are unavailable.` when Alexandria or domain tool discovery partially failed.

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#response-id)

id

string

The ID of the search job

[​](https://docs.firecrawl.dev/api-reference/endpoint/search#response-credits-used)

creditsUsed

integer

The number of credits used for the search

[Suggest edits](https://github.com/firecrawl/firecrawl-docs/edit/main/api-reference/endpoint/search.mdx) [Raise issue](https://github.com/firecrawl/firecrawl-docs/issues/new?title=Issue%20on%20docs&body=Path:%20/api-reference/endpoint/search)

✕