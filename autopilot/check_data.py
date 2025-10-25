#!/usr/bin/env python3
"""Quick script to check telemetry data statistics."""

import json
from pathlib import Path
from collections import Counter

def check_telemetry_data(telemetry_dir: str = "../server/telemetry"):
    """
    Check telemetry data statistics.

    Args:
        telemetry_dir: Path to telemetry directory
    """
    telemetry_path = Path(telemetry_dir)

    if not telemetry_path.exists():
        print(f"❌ Telemetry directory not found: {telemetry_dir}")
        return

    json_files = list(telemetry_path.glob("*.json"))

    if not json_files:
        print(f"❌ No JSON files found in {telemetry_dir}")
        return

    print(f"📊 Telemetry Data Statistics")
    print(f"{'='*60}\n")

    total_samples = 0
    file_stats = []
    all_key_presses = Counter()

    for json_file in sorted(json_files):
        try:
            with open(json_file, 'r') as f:
                data = json.load(f)

            num_samples = len(data)
            total_samples += num_samples

            # Count key presses in this file
            w_count = sum(1 for s in data if s.get('w_pressed'))
            a_count = sum(1 for s in data if s.get('a_pressed'))
            s_count = sum(1 for s in data if s.get('s_pressed'))
            d_count = sum(1 for s in data if s.get('d_pressed'))

            all_key_presses['W'] += w_count
            all_key_presses['A'] += a_count
            all_key_presses['S'] += s_count
            all_key_presses['D'] += d_count

            # Calculate duration (last timestamp - first timestamp)
            if data:
                duration_ms = data[-1]['timestamp'] - data[0]['timestamp']
                duration_sec = duration_ms / 1000
            else:
                duration_sec = 0

            file_stats.append({
                'name': json_file.name,
                'samples': num_samples,
                'duration': duration_sec,
                'w': w_count,
                'a': a_count,
                's': s_count,
                'd': d_count
            })

        except Exception as e:
            print(f"⚠️  Error reading {json_file.name}: {e}")

    # Print file-by-file breakdown
    print(f"📁 Files: {len(json_files)}\n")
    print(f"{'File':<50} {'Samples':>8} {'Duration':>10}")
    print(f"{'-'*70}")
    for stat in file_stats:
        print(f"{stat['name']:<50} {stat['samples']:>8} {stat['duration']:>8.1f}s")

    print(f"\n{'='*60}\n")

    # Print totals
    print(f"📈 Total Statistics:")
    print(f"   Total samples collected: {total_samples:,}")
    print(f"   Average per file: {total_samples // len(json_files):,}")

    # Print key press distribution
    print(f"\n⌨️  Key Press Distribution:")
    print(f"   W (forward):  {all_key_presses['W']:>6,} ({100*all_key_presses['W']/total_samples:>5.1f}%)")
    print(f"   A (left):     {all_key_presses['A']:>6,} ({100*all_key_presses['A']/total_samples:>5.1f}%)")
    print(f"   S (brake):    {all_key_presses['S']:>6,} ({100*all_key_presses['S']/total_samples:>5.1f}%)")
    print(f"   D (right):    {all_key_presses['D']:>6,} ({100*all_key_presses['D']/total_samples:>5.1f}%)")

    # Training recommendations
    print(f"\n{'='*60}\n")
    print(f"🎯 Training Recommendations:")

    if total_samples < 5000:
        print(f"   ⚠️  LOW DATA: You have {total_samples:,} samples")
        print(f"      Recommended: Collect {5000 - total_samples:,} more samples")
        print(f"      Target: 5,000+ samples (10,000+ optimal)")
    elif total_samples < 10000:
        print(f"   ✓ GOOD: You have {total_samples:,} samples")
        print(f"      Recommended: Collect {10000 - total_samples:,} more for better results")
        print(f"      Target: 10,000+ samples")
    else:
        print(f"   ✅ EXCELLENT: You have {total_samples:,} samples")
        print(f"      You have enough data to train a good model!")

    # Check for class imbalance
    print(f"\n   Class Balance:")
    min_key_pct = min(all_key_presses['A'], all_key_presses['D']) / total_samples * 100
    if min_key_pct < 5:
        print(f"   ⚠️  IMBALANCED: Turns (A/D) are rare ({min_key_pct:.1f}%)")
        print(f"      Try driving tracks with more curves")
    else:
        print(f"   ✓ Reasonable balance (turns: {min_key_pct:.1f}%)")

    # Estimate augmented dataset size
    print(f"\n   With data augmentation enabled:")
    print(f"   • Mirror (2x): {total_samples * 2:,} samples")
    print(f"   • Mirror + Noise (4x): {total_samples * 4:,} samples")

    print(f"\n{'='*60}")


if __name__ == "__main__":
    import sys

    # Allow custom telemetry directory as argument
    telemetry_dir = sys.argv[1] if len(sys.argv) > 1 else "../server/telemetry"
    check_telemetry_data(telemetry_dir)
