/**
 * AGNES mobile / laptop outside-home profile for connecting home via AnyTLS.
 *
 * The Sub-Store subscription (`agnes-mobile-home` / `BACKHOME`) supplies
 * exactly one `anytls` node (`家中网关-AnyTLS`).
 *
 * Dual-Mode Anti-Leak Design (2026-11-07):
 * 1. Rule Mode (`规则模式`):
 *    - Domestic traffic (`apple_cn`, `agnes_direct`, `china_direct`, `cncidr`, `CN`)
 *      routes to `🏠 国内流量` (defaults to `DIRECT`). When exiting via `DIRECT`,
 *      Mihomo resolves the domain locally via `direct-nameserver` (Ali/DNSPod DoH)
 *      and connects directly from the outside network without going through home.
 *    - Core overseas & leak-test sets (`leak_test`, `agnes_ai`, `youtube`,
 *      `google_mobile`, `google`) are matched BEFORE domestic rules so `google@cn`
 *      (`gstatic.com`, `fonts.googleapis.com`, etc.) never leaks via outside `DIRECT`.
 *    - Home LAN (`10.10.10.0/24`), DMZ (`10.10.20.0/24`), and all non-CN traffic
 *      (`MATCH,节点选择`) send the original domain name into `家中网关-AnyTLS` with
 *      0 local DNS queries; home OpenClash V5 handles resolution and upstream routing.
 * 2. Global Mode (`全局模式`, or switching `🏠 国内流量` -> `家中网关-AnyTLS`):
 *    - Because `geosite:cn` is NOT in `fake-ip-filter` and `#DIRECT` is removed from
 *      `nameserver`, all domains hold a `198.18.x.x` Fake-IP on the client.
 *    - Switching to Global Mode (or toggling `🏠 国内流量` to `家中网关-AnyTLS`)
 *      takes effect immediately without flushing browser/OS DNS caches: 100% of
 *      traffic sends original domains into `家中网关-AnyTLS` with 0 outside DNS queries.
 * 3. Outside Network Anti-Leak Hardening:
 *    - `IP-CIDR6,::/0,REJECT,no-resolve` at top of rules + `ipv6: false` blocks
 *      outside 5G / Wi-Fi native IPv6 bypass.
 *    - WebRTC STUN UDP ports (`19302`, `3478`, `5349`) are rejected before `DIRECT`.
 *    - `tun` block (`stack: mixed`, `strict-route: true`, `dns-hijack`) prevents
 *      browser DoH / hard-coded DNS from bypassing Mihomo DNS.
 */

const AGNES_HOME_GROUP = "节点选择";
const AGNES_DOMESTIC_GROUP = "🏠 国内流量";
const AGNES_HOME_PROXY = "家中网关-AnyTLS";
const AGNES_HOME_DNS = `10.10.10.10#${AGNES_HOME_PROXY}`;

const AGNES_DIRECT_DNS = [
  "https://dns.alidns.com/dns-query",
  "https://doh.pub/dns-query",
  "223.5.5.5",
  "119.29.29.29",
];

const AGNES_MOBILE_URLS = {
  leak_test: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/LeakTest.list",
  agnes_ai: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/AI.list?v=11",
  youtube: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/YouTube/YouTube.list",
  google_mobile: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/GoogleMobile.list",
  google: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Google/Google.list",
  apple_cn: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/apple-cn.mrs",
  agnes_direct: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/ADirect.list?v=8",
  china_direct: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/cn.mrs",
  cncidr: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geoip/cn.mrs",
};

function agnesMobileRuleProvider(name, behavior = "classical") {
  const url = AGNES_MOBILE_URLS[name];
  const isMrs = url.endsWith(".mrs");
  return {
    type: "http",
    behavior,
    format: isMrs ? "mrs" : "text",
    url,
    path: `./rule_provider/agnes_mobile_${name}.${isMrs ? "mrs" : "list"}`,
    interval: 86400,
  };
}

function main(config = {}) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("AGNES Mobile: Mihomo config input must be an object");
  }
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  if (proxies.length !== 1 || !proxies[0] || proxies[0].type !== "anytls") {
    throw new Error("AGNES Mobile: expected exactly one anytls proxy");
  }
  const proxy = proxies[0];
  proxy.name = AGNES_HOME_PROXY;
  proxy.udp = true;
  if (proxy["skip-cert-verify"] == null) proxy["skip-cert-verify"] = false;

  config.port = 7890;
  config["socks-port"] = 7891;
  config["allow-lan"] = false;
  config.mode = "rule";
  config["log-level"] = "info";
  config.ipv6 = false;
  config["find-process-mode"] = "strict";
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;

  config.tun = {
    enable: true,
    stack: "mixed",
    "auto-route": true,
    "strict-route": true,
    "auto-detect-interface": true,
    "dns-hijack": ["any:53", "tcp://any:53"],
  };

  config.dns = {
    enable: true,
    listen: "127.0.0.1:1053",
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": [
      "*.lan",
      "*.local",
      "+.localhost",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "time.*.com",
      "ntp.*.com",
      "+.stun.*",
    ],
    "respect-rules": false,
    "use-hosts": true,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "proxy-server-nameserver": AGNES_DIRECT_DNS,
    "direct-nameserver": AGNES_DIRECT_DNS,
    "direct-nameserver-follow-policy": false,
    nameserver: [AGNES_HOME_DNS],
    "nameserver-policy": {
      "*.lan": [AGNES_HOME_DNS],
      "*.local": [AGNES_HOME_DNS],
    },
  };

  config.proxies = proxies;
  config["proxy-groups"] = [
    {
      name: AGNES_HOME_GROUP,
      type: "select",
      proxies: [AGNES_HOME_PROXY, "DIRECT"],
    },
    {
      name: AGNES_DOMESTIC_GROUP,
      type: "select",
      proxies: ["DIRECT", AGNES_HOME_PROXY],
    },
  ];

  config["rule-providers"] = {
    leak_test: agnesMobileRuleProvider("leak_test"),
    agnes_ai: agnesMobileRuleProvider("agnes_ai"),
    youtube: agnesMobileRuleProvider("youtube"),
    google_mobile: agnesMobileRuleProvider("google_mobile"),
    google: agnesMobileRuleProvider("google"),
    apple_cn: agnesMobileRuleProvider("apple_cn", "domain"),
    agnes_direct: agnesMobileRuleProvider("agnes_direct"),
    china_direct: agnesMobileRuleProvider("china_direct", "domain"),
    cncidr: agnesMobileRuleProvider("cncidr", "ipcidr"),
  };

  config.rules = [
    "IP-CIDR6,::/0,REJECT,no-resolve",
    "IP-CIDR,10.10.10.0/24,节点选择,no-resolve",
    "IP-CIDR,10.10.20.0/24,节点选择,no-resolve",
    "GEOIP,private,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "AND,((NETWORK,udp),(DST-PORT,19302)),REJECT",
    "AND,((NETWORK,udp),(DST-PORT,3478)),REJECT",
    "AND,((NETWORK,udp),(DST-PORT,5349)),REJECT",
    "RULE-SET,leak_test,节点选择",
    "RULE-SET,agnes_ai,节点选择",
    "RULE-SET,youtube,节点选择",
    "RULE-SET,google_mobile,节点选择",
    "RULE-SET,google,节点选择",
    "RULE-SET,apple_cn,🏠 国内流量",
    "RULE-SET,agnes_direct,🏠 国内流量",
    "RULE-SET,china_direct,🏠 国内流量",
    "GEOSITE,cn,🏠 国内流量",
    "RULE-SET,cncidr,🏠 国内流量,no-resolve",
    "GEOIP,CN,🏠 国内流量,no-resolve",
    "MATCH,节点选择",
  ];
  return config;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { main };
}
