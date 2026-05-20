cask "syc-tool" do
  version "1.0.4"
  sha256 "e5cf558f6c8b374147f834132e9c056834005f7cce0907de958dcb455bd4dcaf"

  name "SYC-TOOL"
  desc "macOS 效率工具箱：天气、终端、便签、剪贴板、悬浮球等"
  homepage "https://sunyanchen1990.github.io/syc-tool-website/"

  url "https://github.com/sunyanchen1990/syc-tool/releases/download/v#{version}/SYC-TOOL-#{version}-arm64.dmg",
      verified: "github.com/sunyanchen1990/syc-tool/"

  depends_on macos: ">= :big_sur"
  depends_on arch: :arm64

  app "SYC-TOOL.app"

  postflight do
    system_command "/usr/bin/xattr",
                   args: ["-cr", "#{appdir}/SYC-TOOL.app"],
                   print_command: false,
                   must_succeed: false
  end

  zap trash: [
    "~/Library/Application Support/desk-mini",
    "~/Library/Preferences/com.syc.tool.plist",
  ]
end
