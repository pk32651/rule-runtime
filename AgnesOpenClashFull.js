/**
 * AGNES Sub-Store Mihomo profile generator.
 *
 * Usage: select the `agnes-openclash` collection as the Mihomo config source,
 * then add this file as a remote JavaScript Script Operator.
 *
 * The collection supplies proxies (including Webshare-Private). This script
 * supplies the established AGNES policy groups, rule providers and rule order.
 */

const AGNES_TEST_URL = "http://www.gstatic.com/generate_204";
const AGNES_TEST_INTERVAL = 300;
const AGNES_TEST_TIMEOUT = 5000;
const AGNES_TEST_TOLERANCE = 150;
const AGNES_STATIC_PROXY_NAME = "Webshare-Private";

const AGNES_URLS = {
  adobe: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Adobe/Adobe.list",
  adobe_activation: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/AdobeActivation/AdobeActivation.list",
  lan: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Lan/Lan.list",
  leak_test: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/LeakTest.list",
  account_safe: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/AccountSafe.list",
  agnes_ai: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/AI.list?v=5",
  gemini: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Gemini/Gemini.list",
  youtube: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/YouTube/YouTube.list",
  google_mobile: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/GoogleMobile.list",
  google_fcm: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/GoogleFCM/GoogleFCM.list",
  google: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Google/Google.list",
  game_download: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Game/GameDownload/GameDownload.list",
  game_download_cn: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Game/GameDownloadCN/GameDownloadCN.list",
  steam_cn: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/SteamCN/SteamCN.list",
  xunlei: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Xunlei/Xunlei.list",
  baidu_cloud: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Cloud/BaiduCloud/BaiduCloud.list",
  acl4ssr_download: "https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/Download.list",
  tiktok: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/TikTok/TikTok.list",
  telegram: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Telegram/Telegram.list",
  spotify: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Spotify/Spotify.list",
  agnes_game: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/Game.list",
  steam: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Steam/Steam.list",
  rockstar: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Rockstar/Rockstar.list",
  blizzard: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Blizzard/Blizzard.list",
  ea: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/EA/EA.list",
  github: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/GitHub/GitHub.list",
  agnes_direct: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/ADirect.list",
  global: "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/refs/heads/master/rule/Clash/Global/Global.list",
  foreign_extra: "https://raw.githubusercontent.com/pk32651/rule-runtime/refs/heads/main/ForeignExtra.list",
  cncidr: "https://raw.githubusercontent.com/Loyalsoldier/clash-rules/release/cncidr.txt",
};

function agnesUnique(items) {
  return [...new Set(items)];
}

function agnesSelect(name, proxies) {
  const choices = agnesUnique(proxies);
  return {
    name,
    type: "select",
    proxies: choices.length ? choices : ["REJECT"],
  };
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

function agnesRuleProvider(name, behavior = "classical") {
  return {
    type: "http",
    behavior,
    format: "text",
    url: AGNES_URLS[name],
    path: `./rule_provider/agnes_${name}.list`,
    interval: 86400,
  };
}

function agnesAppendStatic(choices, staticNames) {
  return agnesUnique([...choices, ...staticNames]);
}

async function main(config = {}) {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("AGNES: Mihomo config input must be an object");
  }

  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  if (!proxies.length) {
    throw new Error("AGNES: the selected Sub-Store collection produced no proxies");
  }

  const proxyNames = proxies.map((proxy, index) => {
    if (!proxy || typeof proxy !== "object" || Array.isArray(proxy)) {
      throw new Error(`AGNES: proxy at index ${index} is invalid`);
    }
    if (typeof proxy.name !== "string" || !proxy.name.trim()) {
      throw new Error(`AGNES: proxy at index ${index} has no valid name`);
    }
    return proxy.name;
  });

  if (new Set(proxyNames).size !== proxyNames.length) {
    throw new Error("AGNES: duplicate proxy names are not allowed");
  }

  const staticProxies = proxies.filter(
    (proxy) => proxy.name === AGNES_STATIC_PROXY_NAME,
  );
  if (staticProxies.length !== 1) {
    throw new Error(
      `AGNES: expected exactly one ${AGNES_STATIC_PROXY_NAME} proxy, found ${staticProxies.length}`,
    );
  }
  if (staticProxies[0].type !== "socks5") {
    throw new Error("AGNES: Webshare-Private must be a socks5 proxy");
  }
  staticProxies[0].udp = false;

  const staticNames = staticProxies.map((proxy) => proxy.name);
  const regularProxies = proxies.filter(
    (proxy) => proxy.name !== AGNES_STATIC_PROXY_NAME,
  );
  const regularNames = regularProxies.map((proxy) => proxy.name);
  const nonGameNames = regularProxies
    .filter((proxy) => !/游戏/.test(proxy.name))
    .map((proxy) => proxy.name);
  const gameNames = regularProxies
    .filter((proxy) => /游戏/.test(proxy.name))
    .map((proxy) => proxy.name);
  const matchRegular = (pattern) =>
    regularProxies
      .filter((proxy) => !/游戏/.test(proxy.name) && pattern.test(proxy.name))
      .map((proxy) => proxy.name);

  const hongKong = matchRegular(/香港/);
  const taiwan = matchRegular(/台湾/);
  const japan = matchRegular(/日本/);
  const singapore = matchRegular(/新加坡/);
  const korea = matchRegular(/韩国/);
  const unitedStates = matchRegular(/美国/);
  const hkTwJpSgKr = matchRegular(/香港|台湾|日本|新加坡|韩国/);
  const twJpSgKr = matchRegular(/台湾|日本|新加坡|韩国/);
  const otherRegions = matchRegular(
    /英国|德国|南非|意大利|法国|加拿大|墨西哥|印度|越南|俄罗斯|澳大利亚|瑞士|瑞典|智利|荷兰|哥伦比亚|巴西|沙特|西班牙|泰国|土耳其|马来西亚|印度尼西亚|菲律宾/,
  );

  const groups = [];
  const addBusinessGroup = (name, choices) =>
    groups.push(agnesSelect(name, agnesAppendStatic(choices, staticNames)));

  addBusinessGroup("🔐 账号安全", [
    "台湾-自动",
    "台湾-手动",
    "所有-自动",
    "所有-手动",
    "🐸 手动切换",
    "DIRECT",
    "REJECT",
  ]);
  addBusinessGroup("⚡ 日常高速", [
    "香港-自动",
    "香港-手动",
    "所有-自动",
    "所有-手动",
    "台湾-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "🐸 手动切换",
    "DIRECT",
    "REJECT",
  ]);
  addBusinessGroup("📥 下载流量", [
    "DIRECT",
    "⚡ 日常高速",
    "香港-自动",
    "所有-手动",
    "🐸 手动切换",
    "REJECT",
  ]);
  groups.push(
    agnesSelect("💧 RJ", [
      "REJECT",
      "DIRECT",
      "所有-自动",
      "所有-手动",
      "香港-自动",
      "台湾-自动",
      "日本-自动",
      "新加坡-自动",
      "韩国-自动",
      "美国-自动",
      "其他-自动",
    ]),
  );
  addBusinessGroup("👽 AI", [
    "台湾-自动",
    "台湾-手动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "所有-自动",
    "所有-手动",
    "🐸 手动切换",
    "DIRECT",
    "REJECT",
  ]);
  addBusinessGroup("📱 Google移动服务", [
    "📀 流媒体",
    "⚡ 日常高速",
    "香港-自动",
    "香港-手动",
    "台湾-自动",
    "台湾-手动",
    "所有-自动",
    "所有-手动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "🐸 手动切换",
    "DIRECT",
    "REJECT",
  ]);
  addBusinessGroup("📘 GitHub", [
    "⚡ 日常高速",
    "DIRECT",
    "所有-自动",
    "所有-手动",
    "港台日新韩-自动",
    "台日新韩-自动",
    "香港-自动",
    "台湾-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "其他-自动",
    "REJECT",
    "🐸 手动切换",
  ]);
  addBusinessGroup("👯‍♂️ TikTok", [
    "台日新韩-自动",
    "台湾-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "⚡ 日常高速",
    "所有-自动",
    "所有-手动",
    "DIRECT",
    "REJECT",
    "🐸 手动切换",
  ]);
  addBusinessGroup("🙋 Telegram", [
    "⚡ 日常高速",
    "DIRECT",
    "所有-自动",
    "所有-手动",
    "港台日新韩-自动",
    "香港-自动",
    "台湾-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "其他-自动",
    "REJECT",
    "🐸 手动切换",
  ]);
  addBusinessGroup("📀 流媒体", [
    "⚡ 日常高速",
    "DIRECT",
    "所有-自动",
    "所有-手动",
    "港台日新韩-自动",
    "台日新韩-自动",
    "香港-自动",
    "台湾-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "其他-自动",
    "REJECT",
    "🐸 手动切换",
  ]);
  addBusinessGroup("📀 音乐", [
    "⚡ 日常高速",
    "DIRECT",
    "所有-自动",
    "所有-手动",
    "港台日新韩-自动",
    "台日新韩-自动",
    "香港-自动",
    "台湾-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "其他-自动",
    "REJECT",
    "🐸 手动切换",
  ]);
  addBusinessGroup("🌍 国外", [
    "⚡ 日常高速",
    "香港-自动",
    "香港-手动",
    "台湾-自动",
    "台湾-手动",
    "所有-自动",
    "所有-手动",
    "港台日新韩-自动",
    "台日新韩-自动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "其他-自动",
    "🐸 手动切换",
    "DIRECT",
    "REJECT",
  ]);
  groups.push(
    agnesSelect("🛡 IPv6兜底", ["香港-自动", "所有-自动", "REJECT"]),
  );
  groups.push(
    agnesSelect("🎮 Game", [
      "⚡ 日常高速",
      "游戏-自动",
      "游戏-手动",
      "DIRECT",
      "所有-自动",
      "所有-手动",
      "港台日新韩-自动",
      "台日新韩-自动",
      "香港-自动",
      "台湾-自动",
      "日本-自动",
      "新加坡-自动",
      "韩国-自动",
      "美国-自动",
      "其他-自动",
      "REJECT",
      "🐸 手动切换",
    ]),
  );
  groups.push(
    agnesSelect("➡️ 国内", [
      "DIRECT",
      "所有-自动",
      "所有-手动",
      "港台日新韩-自动",
      "台日新韩-自动",
      "香港-自动",
      "台湾-自动",
      "日本-自动",
      "新加坡-自动",
      "韩国-自动",
      "美国-自动",
      "其他-自动",
      "REJECT",
      "🐸 手动切换",
    ]),
  );
  addBusinessGroup("🐟 未匹配流量", [
    "DIRECT",
    "🌍 国外",
    "⚡ 日常高速",
    "所有-自动",
    "所有-手动",
    "香港-自动",
    "香港-手动",
    "台湾-自动",
    "台湾-手动",
    "日本-自动",
    "新加坡-自动",
    "韩国-自动",
    "美国-自动",
    "其他-自动",
    "🐸 手动切换",
    "REJECT",
  ]);

  groups.push(
    agnesUrlTest("所有-自动", nonGameNames),
    agnesSelect("所有-手动", nonGameNames),
    agnesUrlTest("港台日新韩-自动", hkTwJpSgKr),
    agnesUrlTest("台日新韩-自动", twJpSgKr),
    agnesUrlTest("香港-自动", hongKong),
    agnesSelect("香港-手动", hongKong),
    agnesUrlTest("台湾-自动", taiwan),
    agnesSelect("台湾-手动", taiwan),
    agnesUrlTest("日本-自动", japan),
    agnesUrlTest("新加坡-自动", singapore),
    agnesUrlTest("韩国-自动", korea),
    agnesUrlTest("美国-自动", unitedStates),
    agnesUrlTest("其他-自动", otherRegions),
    agnesUrlTest("游戏-自动", gameNames),
    agnesSelect("游戏-手动", gameNames),
    agnesSelect("🐸 手动切换", regularNames),
  );

  const ruleProviders = {};
  for (const name of Object.keys(AGNES_URLS)) {
    ruleProviders[name] = agnesRuleProvider(
      name,
      name === "cncidr" ? "ipcidr" : "classical",
    );
  }

  config.proxies = proxies;
  config["proxy-groups"] = groups;
  config["rule-providers"] = ruleProviders;
  config.rules = [
    "RULE-SET,adobe,💧 RJ",
    "RULE-SET,adobe_activation,💧 RJ",
    "RULE-SET,lan,➡️ 国内",
    "RULE-SET,leak_test,🌍 国外",
    "RULE-SET,account_safe,🔐 账号安全",
    "RULE-SET,agnes_ai,👽 AI",
    "RULE-SET,gemini,👽 AI",
    "RULE-SET,youtube,📀 流媒体",
    "RULE-SET,google_mobile,📱 Google移动服务",
    "RULE-SET,google_fcm,📱 Google移动服务",
    "RULE-SET,google,📱 Google移动服务",
    "RULE-SET,game_download,📥 下载流量",
    "RULE-SET,game_download_cn,📥 下载流量",
    "RULE-SET,steam_cn,📥 下载流量",
    "RULE-SET,xunlei,📥 下载流量",
    "RULE-SET,baidu_cloud,📥 下载流量",
    "RULE-SET,acl4ssr_download,📥 下载流量",
    "GEOSITE,category-public-tracker,📥 下载流量",
    "RULE-SET,tiktok,👯‍♂️ TikTok",
    "RULE-SET,telegram,🙋 Telegram",
    "RULE-SET,spotify,📀 音乐",
    "RULE-SET,agnes_game,🎮 Game",
    "RULE-SET,steam,🎮 Game",
    "RULE-SET,rockstar,🎮 Game",
    "RULE-SET,blizzard,🎮 Game",
    "RULE-SET,ea,🎮 Game",
    "RULE-SET,github,📘 GitHub",
    "RULE-SET,agnes_direct,➡️ 国内",
    "RULE-SET,global,🌍 国外",
    "RULE-SET,foreign_extra,🌍 国外",
    "RULE-SET,cncidr,➡️ 国内,no-resolve",
    "GEOIP,CN,➡️ 国内,no-resolve",
    "IP-CIDR6,::/0,🛡 IPv6兜底,no-resolve",
    "DST-PORT,80,🐟 未匹配流量",
    "DST-PORT,443,🐟 未匹配流量",
    "MATCH,DIRECT",
  ];

  return config;
}
