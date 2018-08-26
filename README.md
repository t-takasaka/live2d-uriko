# Live2D 売り子アプリ

Live2D Cubism3に対応した売り子アプリです。プロトタイプ版となります。

サンプルは[こちら](https://t-takasaka.github.io/live2d-uriko/)にあります。ウェブカメラの付いたPCや、スマートフォンでアクセスしてください。

売り子アプリについては[こちらの解説記事](http://dream.live2d.com/archives/5403861.html)をご覧ください。

OpenCV.jsをWebAssemblyビルドし、顔の検出はWeb Workerを使って別スレッドで行っています。

検出にはSSD(Single Shot Multibox Detector)とHaar Cascadeが使えます。PCや性能の高いモバイルでは前者をお使いください。

## 機能

- お客さんがこちらを向く（顔を認識する）と挨拶モーションを実行

- 挨拶モーション後、そのまま顔を視線追従

## TODO

- 近付いてきたら（認識ている顔の領域が大きくなったら）接客モーションを実行

- QRコード決済サービスとの連携





