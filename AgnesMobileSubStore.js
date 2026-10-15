/**
 * AGNES mobile profile for a phone that connects home with AnyTLS.
 *
 * The Sub-Store subscription supplies exactly one anytls node.
 * Domestic names and Chinese IPs go direct. DNS uses the home Ali DoH,
 * Ali DoT and Tencent DoH backup, all forced direct. Other traffic goes
 * to that home node. The router already proxies its own outbound, so the
 * home OpenClash rules decide the exit. This script does not copy those rules.
 */

const AGNES_URLS = {
  direct: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt",
  apple: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/apple.txt",
  cncidr: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt",
  adirect: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/ADirect.list?v=5",
};

const AGNES_ENCRYPTED_DNS = [
  "https://dns.alidns.com/dns-query#DIRECT",
  "tls://dns.alidns.com:853#DIRECT",
  "https://doh.pub/dns-query#DIRECT",
];

function agnesProvider(name, behavior, url) {
  return {
    type: "http",
    behavior,
    format: "text",
    url,
    path: `./rule_provider/mobile_${name}.list`,
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
  if (typeof proxy.name !== "string" || !proxy.name.trim()) {
    throw new Error("AGNES Mobile: proxy has no name");
  }
  proxy.udp = true;
  const home = proxy.name;

  config.mode = "rule";
  config.ipv6 = false;
  config["allow-lan"] = false;
  config["unified-delay"] = true;
  config["find-process-mode"] = "off";
  config.dns = {
    enable: true,
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["geosite:cn", "*.lan", "*.local", "+.localhost"],
    "respect-rules": false,
    "use-hosts": true,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: AGNES_ENCRYPTED_DNS,
    "nameserver-policy": {
      "geosite:cn": AGNES_ENCRYPTED_DNS,
      "geosite:apple-cn": AGNES_ENCRYPTED_DNS,
    },
  };
  config.sniffer = {
    enable: true,
    "parse-pure-ip": true,
    sniff: {
      HTTP: { ports: [80, "8080-8880"] },
      TLS: { ports: [443, 8443] },
    },
  };
  config.proxies = proxies;
  config["proxy-groups"] = [
    {
      name: "回家",
      type: "select",
      proxies: [home, "DIRECT"],
    },
  ];
  config["rule-providers"] = {
    direct: agnesProvider("direct", "domain", AGNES_URLS.direct),
    apple: agnesProvider("apple", "domain", AGNES_URLS.apple),
    adirect: agnesProvider("adirect", "classical", AGNES_URLS.adirect),
    cncidr: agnesProvider("cncidr", "ipcidr", AGNES_URLS.cncidr),
  };
  config.rules = [
    "GEOIP,private,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
    "GEOSITE,cn,DIRECT",
    "RULE-SET,direct,DIRECT",
    "RULE-SET,apple,DIRECT",
    "RULE-SET,adirect,DIRECT",
    "RULE-SET,cncidr,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",
    "AND,((NETWORK,udp),(DST-PORT,3478)),REJECT",
    "AND,((NETWORK,udp),(DST-PORT,19302)),REJECT",
    "AND,((NETWORK,udp),(DST-PORT,5349)),REJECT",
    "MATCH,回家",
  ];
  return config;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { main };
}
