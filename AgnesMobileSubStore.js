/**
 * AGNES mobile / laptop outside-home profile for connecting home via AnyTLS.
 *
 * The Sub-Store subscription (`agnes-mobile-home` / `BACKHOME`) supplies
 * exactly one `anytls` node (`家中网关-AnyTLS`).
 *
 * Dual-Mode Anti-Leak & V5 Consistency Design (2026-11-07, hardened 2026-11-13):
 * 1. Rule Mode (`规则模式`):
 *    - Domestic traffic (`apple_cn`, `agnes_direct`, `china_direct`, `cncidr`, `CN`)
 *      routes to `🏠 国内流量` (defaults to `DIRECT`). When exiting via `DIRECT`,
 *      Mihomo resolves the domain locally via `direct-nameserver` (Ali/DNSPod DoH)
 *      and connects directly from the outside network without going through home.
 *    - Core overseas & anti-fraud sets (`leak_test`, `account_safe`, `agnes_ai`,
 *      `youtube`, `google_mobile`, `google`) are matched BEFORE domestic rules so
 *      `google@cn` (`gstatic.com`, `fonts.googleapis.com`, etc.) and shared auth/payment
 *      domains never leak via outside `DIRECT`.
 *    - Home LAN (`10.10.10.0/24` — including `:65531` Creator Profile listener),
 *      DMZ (`10.10.20.0/24`), home subdomains (`DOMAIN-SUFFIX,<homeDomain>,节点选择`),
 *      and all non-CN traffic (`MATCH,节点选择`) send the original domain name into
 *      `家中网关-AnyTLS` with 0 local DNS queries; home OpenClash V5 handles
 *      resolution and upstream routing.
 * 2. Global Mode (`全局模式`, or switching `🏠 国内流量` -> `家中网关-AnyTLS`):
 *    - Because `geosite:cn` is NOT in `fake-ip-filter` and `#DIRECT` is removed from
 *      `nameserver`, all domains hold a `198.18.x.x` Fake-IP on the client.
 *    - Switching to Global Mode (or toggling `🏠 国内流量` to `家中网关-AnyTLS`)
 *      takes effect immediately without flushing browser/OS DNS caches: 100% of
 *      traffic sends original domains into `家中网关-AnyTLS`.
 * 3. Outside Network Anti-Leak, WebRTC & QUIC Hardening (2026-11-13):
 *    - `节点选择` and `GLOBAL` contain ONLY `家中网关-AnyTLS` (`DIRECT` removed from
 *      `节点选择` to prevent accidental tap leaks on mobile UI).
 *    - `IP-CIDR6,::/0,REJECT,no-resolve` at top of rules with top-level `ipv6: true`
 *      so TUN captures outside native 5G/hotel IPv6 and drops it cleanly (`dns.ipv6: false`).
 *    - `+.stun.*` removed from `fake-ip-filter` so STUN hosts never trigger real-IP
 *      resolution. Google WebRTC STUN (`UDP 19302-19309`) is rejected globally BEFORE
 *      any overseas rule-set can send it into the tunnel.
 *    - Overseas QUIC (`UDP 443`) and non-standard WebRTC STUN/TURN (`UDP 3478/5349`)
 *      are rejected both on the 6 fronted overseas sets and after domestic rules —
 *      matching home V5's `disable_udp_quic=1` (which AnyTLS loopback handoff would
 *      otherwise bypass) while keeping domestic WeChat/Tencent Meeting calls intact.
 *    - `sniffer` enabled (`parse-pure-ip: true`, `override-destination: false`) aligned
 *      with home V5 to catch hardcoded IP connections without rewriting destinations.
 */

const AGNES_HOME_GROUP = "节点选择";
const AGNES_DOMESTIC_GROUP = "🏠 国内流量";
const AGNES_HOME_PROXY = "家中网关-AnyTLS";
const AGNES_HOME_DNS = `10.10.10.10#${AGNES_HOME_PROXY}`;
const AGNES_DEFAULT_HOME_DOMAIN = "lvmoyu.xyz";

const AGNES_DIRECT_DNS = [
  "https://dns.alidns.com/dns-query",
  "https://doh.pub/dns-query",
  "223.5.5.5",
  "119.29.29.29",
];

const AGNES_MOBILE_URLS = {
  leak_test: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/LeakTest.list?v=2",
  account_safe: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/AccountSafe.list?v=10",
  agnes_ai: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/AI.list?v=12",
  youtube: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/YouTube/YouTube.list",
  google_mobile: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/GoogleMobile.list",
  google: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Google/Google.list",
  apple_cn: "https://raw.githubusercontent.com/MetaCubeX/meta-rules-dat/refs/heads/meta/geo/geosite/apple-cn.mrs",
  agnes_direct: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/ADirect.list?v=9",
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
    // Download via home tunnel: a failed outside-direct download would empty the set.
    proxy: AGNES_HOME_PROXY,
  };
}

function agnesExtractHomeDomain(server) {
  const raw = String(server || "")
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();
  const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(raw);
  const isIpv6 = raw.includes(":");
  if (!raw || isIpv4 || isIpv6) {
    return AGNES_DEFAULT_HOME_DOMAIN;
  }
  return raw;
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
  const homeDomain = agnesExtractHomeDomain(proxy.server);
  proxy.name = AGNES_HOME_PROXY;
  proxy.udp = true;
  // Home is IPv4-only; public DNS may carry a stale AAAA for the server name.
  proxy["ip-version"] = "ipv4";
  if (proxy["skip-cert-verify"] == null) proxy["skip-cert-verify"] = false;

  config.port = 7890;
  config["socks-port"] = 7891;
  config["allow-lan"] = false;
  config.mode = "rule";
  config["log-level"] = "info";
  // true so TUN captures IPv6 and `IP-CIDR6,::/0,REJECT` can drop it (dns.ipv6 stays false).
  config.ipv6 = true;
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

  config.sniffer = {
    enable: true,
    "parse-pure-ip": true,
    "force-dns-mapping": true,
    "override-destination": false,
    sniff: {
      HTTP: {
        ports: [80, "8080-8880"],
        "override-destination": false,
      },
      TLS: {
        ports: [443, 8443],
      },
      QUIC: {
        ports: [443],
      },
    },
    "skip-domain": [
      "+.apple.com",
      "+.push.apple.com",
      "Mijia Cloud",
      "dlg.io.mi.com",
      "+.oray.com",
      "+.sunlogin.net",
    ],
  };

  config.proxies = proxies;
  config["proxy-groups"] = [
    {
      name: AGNES_HOME_GROUP,
      type: "select",
      proxies: [AGNES_HOME_PROXY],
    },
    {
      name: AGNES_DOMESTIC_GROUP,
      type: "select",
      proxies: ["DIRECT", AGNES_HOME_PROXY],
    },
    {
      // Global Mode uses this group. Mihomo's auto GLOBAL defaults to DIRECT.
      name: "GLOBAL",
      type: "select",
      proxies: [AGNES_HOME_PROXY],
    },
  ];

  config["rule-providers"] = {
    leak_test: agnesMobileRuleProvider("leak_test"),
    account_safe: agnesMobileRuleProvider("account_safe"),
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
    // Global Google WebRTC STUN block (must precede Google rule-sets; never used by domestic apps).
    "AND,((NETWORK,udp),(DST-PORT,19302-19309)),REJECT",
    // Block QUIC (UDP 443) and STUN/TURN (UDP 3478/5349) on fronted overseas sets before they enter the tunnel.
    "AND,((NETWORK,udp),(DST-PORT,443/3478/5349),(OR,((RULE-SET,leak_test),(RULE-SET,account_safe),(RULE-SET,agnes_ai),(RULE-SET,youtube),(RULE-SET,google_mobile),(RULE-SET,google)))),REJECT",
    "RULE-SET,leak_test,节点选择",
    "RULE-SET,account_safe,节点选择",
    "RULE-SET,agnes_ai,节点选择",
    "RULE-SET,youtube,节点选择",
    "RULE-SET,google_mobile,节点选择",
    "RULE-SET,google,节点选择",
    // Keep apex domain in domestic group; send all subdomains (*.lvmoyu.xyz) into home tunnel
    // before agnes_direct (which contains DOMAIN-SUFFIX,<homeDomain>). Auto-follows proxy.server.
    `DOMAIN,${homeDomain},${AGNES_DOMESTIC_GROUP}`,
    `DOMAIN-SUFFIX,${homeDomain},${AGNES_HOME_GROUP}`,
    "RULE-SET,apple_cn,🏠 国内流量",
    "RULE-SET,agnes_direct,🏠 国内流量",
    "RULE-SET,china_direct,🏠 国内流量",
    "GEOSITE,cn,🏠 国内流量",
    "RULE-SET,cncidr,🏠 国内流量,no-resolve",
    "GEOIP,CN,🏠 国内流量,no-resolve",
    // Block QUIC (UDP 443, aligning with home fw4 disable_udp_quic=1) and STUN/TURN for all remaining non-CN traffic.
    "AND,((NETWORK,udp),(DST-PORT,443)),REJECT",
    "AND,((NETWORK,udp),(DST-PORT,3478)),REJECT",
    "AND,((NETWORK,udp),(DST-PORT,5349)),REJECT",
    "MATCH,节点选择",
  ];
  return config;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { main };
}
