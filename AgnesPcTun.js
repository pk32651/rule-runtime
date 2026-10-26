/**
 * AGNES PC TUN profile.
 *
 * Use the same Sub-Store collection as the home gateway. The collection
 * supplies proxies, including the single socks5 node Webshare-Private.
 * This script supplies a small TUN config for one computer.
 *
 * Gemini, Antigravity, OpenAI and 谷歌服务 each select Webshare-Private,
 * their own manual group, or DIRECT. Each manual group lists non-game
 * airport lines and is independent. Webshare-Private still goes through
 * Webshare-前置. Antigravity rules are ahead of Gemini and Google.
 * The shared host generativelanguage.googleapis.com stays in Gemini.list.
 * DIRECT still hands the flow to the home gateway.
 * Webshare-前置 is 香港-自动, 日本-自动, then DIRECT. Same order as the gateway.
 *
 * Other traffic is DIRECT. The gateway still applies its own policy.
 * Domestic names are resolved on this computer with the gateway's Ali DoH
 * and Tencent DoH backup. MosDNS on the gateway listens only on 127.0.0.1.
 */

const AGNES_TEST_URL = "http://www.gstatic.com/generate_204";
const AGNES_TEST_INTERVAL = 300;
const AGNES_TEST_TIMEOUT = 5000;
const AGNES_TEST_TOLERANCE = 150;
const AGNES_STATIC_PROXY_NAME = "Webshare-Private";
const AGNES_WEBSHARE_DIALER_GROUP = "Webshare-前置";
// [主] 是一年期 v2-1Y，[备] 是可替换的第二条。标记由 Sub-Store 打上。
const AGNES_PRIMARY_MARK = "[主]";
const AGNES_BACKUP_MARK = "[备]";
const AGNES_INFO_NODE = /到期|流量|获取|重置|套餐|剩余|官网|导航/;

const AGNES_URLS = {
  antigravity: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/Antigravity.list?v=1",
  gemini: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/Gemini.list?v=1",
  openai: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/OpenAI.list?v=1",
  google_mobile: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/GoogleMobile.list",
  google_fcm: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/GoogleFCM/GoogleFCM.list",
  google: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Google/Google.list",
  cncidr: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt",
};

function agnesUnique(items) {
  return [...new Set(items)];
}

function agnesSelect(name, proxies) {
  const choices = agnesUnique(proxies);
  return { name, type: "select", proxies: choices.length ? choices : ["REJECT"] };
}

function agnesUrlTest(name, proxies) {
  const choices = agnesUnique(proxies);
  if (!choices.length) return agnesSelect(name, ["REJECT"]);
  return {
    name,
    type: "url-test",
    proxies: choices,
    url: AGNES_TEST_URL,
    interval: AGNES_TEST_INTERVAL,
    timeout: AGNES_TEST_TIMEOUT,
    tolerance: AGNES_TEST_TOLERANCE,
    lazy: true,
  };
}

function agnesFallback(name, proxies) {
  const choices = agnesUnique(proxies);
  if (!choices.length) return agnesSelect(name, ["REJECT"]);
  return {
    name,
    type: "fallback",
    proxies: choices,
    url: AGNES_TEST_URL,
    interval: AGNES_TEST_INTERVAL,
    timeout: AGNES_TEST_TIMEOUT,
    lazy: true,
  };
}

function agnesRuleProvider(name, behavior) {
  return {
    type: "http",
    behavior,
    format: "text",
    url: AGNES_URLS[name],
    path: `./rule_provider/pc_${name}.list`,
    interval: 86400,
  };
}

async function main(config = {}) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("AGNES PC: Mihomo config input must be an object");
  }

  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  if (!proxies.length) {
    throw new Error("AGNES PC: the selected Sub-Store collection produced no proxies");
  }

  const proxyNames = proxies.map((proxy, index) => {
    if (!proxy || typeof proxy !== "object" || Array.isArray(proxy)) {
      throw new Error(`AGNES PC: proxy at index ${index} is invalid`);
    }
    if (typeof proxy.name !== "string" || !proxy.name.trim()) {
      throw new Error(`AGNES PC: proxy at index ${index} has no valid name`);
    }
    return proxy.name;
  });
  if (new Set(proxyNames).size !== proxyNames.length) {
    throw new Error("AGNES PC: duplicate proxy names are not allowed");
  }

  const staticProxies = proxies.filter((proxy) => proxy.name === AGNES_STATIC_PROXY_NAME);
  if (staticProxies.length !== 1) {
    throw new Error(`AGNES PC: expected exactly one ${AGNES_STATIC_PROXY_NAME} proxy, found ${staticProxies.length}`);
  }
  if (staticProxies[0].type !== "socks5") {
    throw new Error("AGNES PC: Webshare-Private must be a socks5 proxy");
  }
  staticProxies[0].udp = true;
  staticProxies[0]["dialer-proxy"] = AGNES_WEBSHARE_DIALER_GROUP;

  const regularProxies = proxies.filter((proxy) => proxy.name !== AGNES_STATIC_PROXY_NAME);
  const laneOf = (proxy) => {
    if (proxy.name.startsWith(AGNES_PRIMARY_MARK)) return "primary";
    if (proxy.name.startsWith(AGNES_BACKUP_MARK)) return "backup";
    return "";
  };
  const usable = regularProxies.filter(
    (proxy) => laneOf(proxy) && !AGNES_INFO_NODE.test(proxy.name) && !/游戏/.test(proxy.name),
  );
  const namesOf = (lane, pattern) =>
    usable
      .filter((proxy) => laneOf(proxy) === lane && (!pattern || pattern.test(proxy.name)))
      .map((proxy) => proxy.name);
  const addAuto = (label, pattern) => {
    const created = [];
    const members = [];
    const primary = namesOf("primary", pattern);
    const backup = namesOf("backup", pattern);
    if (primary.length) {
      created.push(agnesUrlTest(`${label}-主`, primary));
      members.push(`${label}-主`);
    }
    if (backup.length) {
      created.push(agnesUrlTest(`${label}-备`, backup));
      members.push(`${label}-备`);
    }
    created.push(
      members.length ? agnesFallback(`${label}-自动`, members) : agnesSelect(`${label}-自动`, ["REJECT"]),
    );
    return created;
  };
  const manualNames = [...namesOf("primary", null), ...namesOf("backup", null)];

  const groups = [
    agnesSelect(AGNES_WEBSHARE_DIALER_GROUP, ["香港-自动", "日本-自动", "DIRECT"]),
    agnesSelect("Gemini", [AGNES_STATIC_PROXY_NAME, "Gemini-手动", "DIRECT"]),
    agnesSelect("Antigravity", [AGNES_STATIC_PROXY_NAME, "Antigravity-手动", "DIRECT"]),
    agnesSelect("OpenAI", [AGNES_STATIC_PROXY_NAME, "OpenAI-手动", "DIRECT"]),
    agnesSelect("谷歌服务", [AGNES_STATIC_PROXY_NAME, "谷歌服务-手动", "DIRECT"]),
    agnesSelect("Gemini-手动", manualNames),
    agnesSelect("Antigravity-手动", manualNames),
    agnesSelect("OpenAI-手动", manualNames),
    agnesSelect("谷歌服务-手动", manualNames),
    ...addAuto("香港", /香港/),
    ...addAuto("日本", /日本/),
  ];

  const ruleProviders = {
    antigravity: agnesRuleProvider("antigravity", "classical"),
    gemini: agnesRuleProvider("gemini", "classical"),
    openai: agnesRuleProvider("openai", "classical"),
    google_mobile: agnesRuleProvider("google_mobile", "classical"),
    google_fcm: agnesRuleProvider("google_fcm", "classical"),
    google: agnesRuleProvider("google", "classical"),
    cncidr: agnesRuleProvider("cncidr", "ipcidr"),
  };

  config.mode = "rule";
  config.ipv6 = true;
  config["find-process-mode"] = "off";
  config.tun = {
    enable: true,
    stack: "mixed",
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "dns-hijack": ["any:53", "tcp://any:53"],
    mtu: 1500,
  };
  config.dns = {
    enable: true,
    ipv6: true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter": ["geosite:cn", "*.lan", "*.local", "+.localhost"],
    "respect-rules": false,
    "use-hosts": true,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: [
      "https://dns.alidns.com/dns-query",
      "https://doh.pub/dns-query",
    ],
    "direct-nameserver": ["223.5.5.5"],
    "nameserver-policy": {
      "geosite:cn": ["https://dns.alidns.com/dns-query", "https://doh.pub/dns-query"],
      "geosite:private": ["223.5.5.5"],
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
  config["proxy-groups"] = groups;
  config["rule-providers"] = ruleProviders;
  config.rules = [
    "IP-CIDR,127.0.0.0/8,REJECT,no-resolve",
    "IP-CIDR6,::1/128,REJECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "IP-CIDR6,fe80::/10,DIRECT,no-resolve",
    "RULE-SET,antigravity,Antigravity",
    "RULE-SET,gemini,Gemini",
    "RULE-SET,openai,OpenAI",
    "RULE-SET,google_mobile,谷歌服务",
    "RULE-SET,google_fcm,谷歌服务",
    "RULE-SET,google,谷歌服务",
    "GEOSITE,cn,DIRECT",
    "RULE-SET,cncidr,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,DIRECT",
  ];
  return config;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { main };
}
