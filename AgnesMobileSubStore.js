/**
 * AGNES Mobile Sub-Store Profile Generator (Simplified Dual-Route Edition).
 * 专供手机/外地独立设备使用的极简双轨 Sub-Store 配置文件生成脚本。
 * 
 * 核心设计：
 * 1. 极简两分法：国内全部走 DoH 加密直连，识别不到的/海外流量统一走代理。
 * 2. 丰富国内地址库：GEOSITE-cn + 苹果国内优化 + Direct 域名集 + CNCIDR 全量段 + GEOIP-CN。
 * 3. 继承家庭网关实机验证的阿里/腾讯 DoH 加密 DNS，杜绝公共 Wi-Fi 嗅探。
 * 4. Fake-IP 物理级防泄露，海外域名本地零公网查询，由远端代理节点代解。
 * 5. 自动捕获订阅中的全部节点，并生成自动选优及常用地区（港/台/日/新/美）策略组。
 */

const AGNES_TEST_URL = "http://www.gstatic.com/generate_204";
const AGNES_TEST_INTERVAL = 300;
const AGNES_TEST_TIMEOUT = 5000;
const AGNES_TEST_TOLERANCE = 150;

function filterProxies(proxies, pattern) {
  return proxies.filter((p) => pattern.test(p.name)).map((p) => p.name);
}

function main(config) {
  const rawProxies = config.proxies || [];
  const proxyNames = rawProxies.map((p) => p.name);

  // 地区正则筛选
  const hkNodes = filterProxies(rawProxies, /.*(香港|HK|Hong Kong).*/);
  const twNodes = filterProxies(rawProxies, /.*(台湾|TW|Taiwan).*/);
  const jpNodes = filterProxies(rawProxies, /.*(日本|JP|Japan).*/);
  const sgNodes = filterProxies(rawProxies, /.*(新加坡|SG|Singapore).*/);
  const usNodes = filterProxies(rawProxies, /.*(美国|US|United States).*/);

  const groups = [
    {
      name: "🚀 节点选择",
      type: "select",
      proxies: [
        "⚡ 自动选优",
        "🇭🇰 香港-自动",
        "🇹🇼 台湾-自动",
        "🇯🇵 日本-自动",
        "🇸🇬 新加坡-自动",
        "🇺🇸 美国-自动",
        "🐸 全部节点",
        "DIRECT"
      ]
    },
    {
      name: "⚡ 自动选优",
      type: "url-test",
      url: AGNES_TEST_URL,
      interval: AGNES_TEST_INTERVAL,
      timeout: AGNES_TEST_TIMEOUT,
      tolerance: AGNES_TEST_TOLERANCE,
      lazy: true,
      proxies: proxyNames.length > 0 ? proxyNames : ["DIRECT"]
    },
    {
      name: "🇭🇰 香港-自动",
      type: "url-test",
      url: AGNES_TEST_URL,
      interval: AGNES_TEST_INTERVAL,
      timeout: AGNES_TEST_TIMEOUT,
      tolerance: AGNES_TEST_TOLERANCE,
      lazy: true,
      proxies: hkNodes.length > 0 ? hkNodes : ["DIRECT"]
    },
    {
      name: "🇹🇼 台湾-自动",
      type: "url-test",
      url: AGNES_TEST_URL,
      interval: AGNES_TEST_INTERVAL,
      timeout: AGNES_TEST_TIMEOUT,
      tolerance: AGNES_TEST_TOLERANCE,
      lazy: true,
      proxies: twNodes.length > 0 ? twNodes : ["DIRECT"]
    },
    {
      name: "🇯🇵 日本-自动",
      type: "url-test",
      url: AGNES_TEST_URL,
      interval: AGNES_TEST_INTERVAL,
      timeout: AGNES_TEST_TIMEOUT,
      tolerance: AGNES_TEST_TOLERANCE,
      lazy: true,
      proxies: jpNodes.length > 0 ? jpNodes : ["DIRECT"]
    },
    {
      name: "🇸🇬 新加坡-自动",
      type: "url-test",
      url: AGNES_TEST_URL,
      interval: AGNES_TEST_INTERVAL,
      timeout: AGNES_TEST_TIMEOUT,
      tolerance: AGNES_TEST_TOLERANCE,
      lazy: true,
      proxies: sgNodes.length > 0 ? sgNodes : ["DIRECT"]
    },
    {
      name: "🇺🇸 美国-自动",
      type: "url-test",
      url: AGNES_TEST_URL,
      interval: AGNES_TEST_INTERVAL,
      timeout: AGNES_TEST_TIMEOUT,
      tolerance: AGNES_TEST_TOLERANCE,
      lazy: true,
      proxies: usNodes.length > 0 ? usNodes : ["DIRECT"]
    },
    {
      name: "🐸 全部节点",
      type: "select",
      proxies: proxyNames.length > 0 ? proxyNames : ["DIRECT"]
    }
  ];

  const ruleProviders = {
    china_direct_domain: {
      type: "http",
      behavior: "domain",
      format: "text",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/direct.txt",
      path: "./rule_provider/china_direct_domain.txt",
      interval: 86400
    },
    apple_cn_domain: {
      type: "http",
      behavior: "domain",
      format: "text",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/apple.txt",
      path: "./rule_provider/apple_cn_domain.txt",
      interval: 86400
    },
    china_ip_cidr: {
      type: "http",
      behavior: "ipcidr",
      format: "text",
      url: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt",
      path: "./rule_provider/china_ip_cidr.txt",
      interval: 86400
    }
  };

  const rules = [
    // 1. 本地局域网
    "GEOIP,private,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR6,fc00::/7,DIRECT,no-resolve",
    "IP-CIDR6,fe80::/10,DIRECT,no-resolve",

    // 2. 超全国内域名集合（直连）
    "GEOSITE,cn,DIRECT",
    "RULE-SET,china_direct_domain,DIRECT",
    "RULE-SET,apple_cn_domain,DIRECT",

    // 3. 超全国内 IP 集合（直连）
    "RULE-SET,china_ip_cidr,DIRECT,no-resolve",
    "GEOIP,CN,DIRECT,no-resolve",

    // 4. 其余所有识别不到的流量（统一走代理）
    "MATCH,🚀 节点选择"
  ];

  return {
    ...config,
    port: 7890,
    "socks-port": 7891,
    "mixed-port": 7892,
    "allow-lan": false,
    mode: "rule",
    "log-level": "info",
    ipv6: false,
    "unified-delay": true,
    "tcp-concurrent": true,
    dns: {
      enable: true,
      listen: "127.0.0.1:1053",
      ipv6: false,
      "enhanced-mode": "fake-ip",
      "fake-ip-range": "198.18.0.1/16",
      "fake-ip-filter-mode": "blacklist",
      "fake-ip-filter": [
        "*.lan", "*.local", "localhost.ptlogin2.qq.com", "+.msftconnecttest.com",
        "+.msftnsci.com", "dns.msftnsci.com", "www.msftnsci.com", "www.msftconnecttest.com",
        "*.pool.ntp.org", "time.*.apple.com", "time.*.com"
      ],
      "default-nameserver": ["223.5.5.5", "119.29.29.29"],
      "proxy-server-nameserver": ["223.5.5.5", "119.29.29.29"],
      nameserver: [
        "https://dns.alidns.com/dns-query",
        "https://doh.pub/dns-query"
      ],
      "nameserver-policy": {
        "geosite:cn": [
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "geosite:apple-cn": [
          "https://dns.alidns.com/dns-query",
          "https://doh.pub/dns-query"
        ],
        "geosite:geolocation-!cn": [
          "https://dns.alidns.com/dns-query"
        ]
      }
    },
    "proxy-groups": groups,
    "rule-providers": ruleProviders,
    rules: rules
  };
}