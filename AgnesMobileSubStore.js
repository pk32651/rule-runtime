/**
 * AGNES mobile profile for a phone that connects home with AnyTLS.
 *
 * The Sub-Store subscription supplies exactly one anytls node.
 * Domestic names resolve with Ali and Tencent DoH and go direct.
 * Home LAN, DMZ, foreign names and everything else use the home node.
 * Foreign and local names are resolved by the home gateway at 10.10.10.10,
 * reached through the tunnel. The phone is outside that subnet on cellular.
 */

const AGNES_HOME_GROUP = "节点选择";
const AGNES_HOME_PROXY = "家中网关-AnyTLS";
const AGNES_HOME_DNS = `10.10.10.10#${AGNES_HOME_GROUP}`;
const AGNES_DIRECT_DNS = [
  "https://dns.alidns.com/dns-query#DIRECT",
  "tls://dns.alidns.com:853#DIRECT",
  "https://doh.pub/dns-query#DIRECT",
];

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
  config["find-process-mode"] = "off";
  config.dns = {
    enable: true,
    listen: "127.0.0.1:1053",
    ipv6: false,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["geosite:cn", "*.lan", "*.local", "+.localhost"],
    "respect-rules": false,
    "use-hosts": true,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: AGNES_DIRECT_DNS,
    "nameserver-policy": {
      "*.lan": [AGNES_HOME_DNS],
      "*.local": [AGNES_HOME_DNS],
      "geosite:cn": AGNES_DIRECT_DNS,
      "geosite:geolocation-!cn": [AGNES_HOME_DNS],
    },
    fallback: [AGNES_HOME_DNS],
    "fallback-filter": {
      geoip: true,
      "geoip-code": "CN",
      ipcidr: ["240.0.0.0/4"],
    },
  };
  config.proxies = proxies;
  config["proxy-groups"] = [
    {
      name: AGNES_HOME_GROUP,
      type: "select",
      proxies: [AGNES_HOME_PROXY, "DIRECT"],
    },
  ];
  config["rule-providers"] = {};
  config.rules = [
    "IP-CIDR,10.10.10.0/24,节点选择,no-resolve",
    "IP-CIDR,10.10.20.0/24,节点选择,no-resolve",
    "GEOIP,private,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,节点选择",
  ];
  return config;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { main };
}
