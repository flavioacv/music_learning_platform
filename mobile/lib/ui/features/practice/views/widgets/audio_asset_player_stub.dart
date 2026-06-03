import 'dart:async';

class AudioAssetPlayer {
  Future<void> play(String assetPath) async {
    await Future<void>.delayed(const Duration(seconds: 2));
  }

  void dispose() {}
}
