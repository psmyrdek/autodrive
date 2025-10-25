# Training Improvements Guide

## Summary of Changes

I've made several improvements to address the 0.15 loss plateau:

### 1. Increased Telemetry Sampling Frequency ✅
- **Changed**: `TelemetryTracker.TELEMETRY_SAMPLE_INTERVAL` from 100ms → 50ms
- **Impact**: Doubles data collection rate (10Hz → 20Hz), captures more detail during quick maneuvers
- **Location**: `src/systems/TelemetryTracker.ts:17`

### 2. Improved Model Architecture ✅
- **Changed**: Hidden layers from [64, 32] → [128, 64, 32]
- **Changed**: Dropout from 0.2 → 0.1 (and removed from last hidden layer)
- **Impact**: More model capacity (~10,000 params vs ~2,500), less regularization for limited data
- **Location**: `autopilot/src/autopilot/model.py`

### 3. Added Data Augmentation ✅
- **New file**: `autopilot/src/autopilot/augmentation.py`
- **Features**:
  - **Mirror augmentation**: Swap left/right sensors and A/D keys (2x data)
  - **Noise injection**: Add Gaussian noise to sensors for robustness (2x data)
  - **Combined**: Can increase dataset 4x (original + mirror + noisy + noisy_mirror)
- **Usage**: Enabled by default, disable with `--no-augmentation` flag

### 4. Class Weight Calculation ✅
- **Added**: Automatic calculation of positive class weights for imbalanced data
- **Impact**: Model pays more attention to rare actions (A/D/S turns)
- **Note**: Currently calculated but not used. See "Next Steps" below.
- **Location**: `autopilot/src/autopilot/train.py:189-200`

## Critical Issue: Insufficient Training Data

**Current situation**: Only ~2,645 samples across 6 files
**Minimum recommended**: 10,000+ samples
**Optimal**: 50,000-100,000 samples

### Action Required: Collect More Data

1. **Drive multiple tracks** (10-15 different tracks)
2. **Vary driving styles**:
   - Aggressive (tight turns, high speed)
   - Cautious (slower, wider turns)
   - Different racing lines
3. **Include diverse scenarios**:
   - Tight corners
   - Long straightaways
   - S-curves
   - Chicanes

With augmentation enabled, collecting 5,000 raw samples → 20,000 training samples.

## Training Workflow

### Step 1: Collect More Telemetry
```bash
# Run the game and drive manually
npm run dev:all

# Navigate to /game in browser
# Drive around, then:
# - Press 'T' to manually save telemetry
# - Or let crash modal save automatically
```

### Step 2: Train with Improvements
```bash
cd autopilot

# Train with default settings (includes augmentation)
uv run python -m autopilot.train

# Train with more epochs if you have more data
uv run python -m autopilot.train --epochs 100

# Train without augmentation (not recommended)
uv run python -m autopilot.train --no-augmentation

# Check training progress
# Look for:
# - Val loss < 0.10
# - Per-key accuracy > 90% for all keys
```

### Step 3: Analyze Results
```bash
# Use the Jupyter notebook to visualize
jupyter notebook visualize_training.ipynb

# Check:
# 1. Loss curves (train vs val)
# 2. Per-key accuracy
# 3. Class distribution (are A/D/S still rare?)
```

## Expected Improvements

With these changes + more data:

| Metric | Before | Expected After |
|--------|--------|----------------|
| Dataset size | 2,645 | 20,000+ (with augmentation) |
| Model params | ~2,500 | ~10,000 |
| Val loss | 0.15 | < 0.10 |
| Overall accuracy | ? | > 90% |
| Turn accuracy (A/D) | ? | > 85% |

## Next Steps (Future Improvements)

### Immediate (High Priority)
1. ✅ **Collect more training data** (see above)
2. **Implement class weighting in loss function**:
   ```python
   # In train.py, replace:
   criterion = nn.BCELoss()
   # With:
   criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weights)
   # And remove Sigmoid from model output layer
   ```

### Short-term (Medium Priority)
3. **Add temporal context** (simple approach):
   - Modify data loader to include previous frame(s)
   - Input becomes: [sensors_t, speed_t, sensors_t-1, speed_t-1] (8 features)
   - No LSTM needed, just concatenate features

4. **Learning rate scheduling**:
   ```python
   scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
       optimizer, mode='min', factor=0.5, patience=5
   )
   ```

5. **Add more input features**:
   - Car rotation angle
   - Angular velocity
   - Velocity components (vx, vy)
   - Distance to nearest wall on each side

### Long-term (Low Priority)
6. **Early stopping** to prevent overfitting
7. **Cross-validation** instead of single train/val split
8. **Ensemble models** (train 3-5 models, average predictions)
9. **Online learning** (continuously retrain as you collect more data)

## Troubleshooting

### Loss stuck above 0.15
- ❌ Not enough training data → Collect 5-10x more
- ❌ Data too similar → Drive different tracks/styles
- ❌ Validation loss >> training loss → Overfitting, reduce dropout or add more data

### Model always goes straight
- ❌ Class imbalance → Implement BCEWithLogitsLoss with pos_weight
- ❌ Not enough turn examples → Drive tracks with more curves
- ❌ Turns too rare in data → Check label distribution

### Inference is slow
- ❌ API latency → Run FastAPI server locally, not in container
- ❌ Network delay → Check if localhost:8000 is accessible
- ❌ Model too large → Not an issue with current architecture

### Model crashes immediately
- ❌ Bad sensor readings → Check normalization params match training
- ❌ Wrong input format → Verify input order: [l_sensor, c_sensor, r_sensor, speed]
- ❌ Async delay → See "Fix Async Control" below

## Advanced: Fix Async Control Issue

**Problem**: `AutopilotSystem.mlLogic()` uses async fetch, causing 1-frame delay in `GameScene.handleAutopilotInput()` (line 272).

**Current code**:
```typescript
this.autopilotSystem.getControlCommands(carState).then((commands) => {
  // Commands from PREVIOUS frame applied here
  this.carPhysics.accelerate(deltaSeconds);
});
```

**Solution 1**: Make inference synchronous (if API is fast enough)
```typescript
// Not recommended in browser - blocks game loop
const commands = await this.autopilotSystem.getControlCommands(carState);
```

**Solution 2**: Implement command buffering
```typescript
// Store latest commands in class variable
private latestCommands: ControlCommands | null = null;

// Update commands asynchronously
this.autopilotSystem.getControlCommands(carState).then((commands) => {
  this.latestCommands = commands;
});

// Apply latest available commands (from previous frame)
if (this.latestCommands) {
  this.applyCommands(this.latestCommands, deltaSeconds);
}
```

This is only critical if inference latency > 16ms (one frame at 60 FPS).

## References

- Model architecture: `autopilot/src/autopilot/model.py`
- Training script: `autopilot/src/autopilot/train.py`
- Data augmentation: `autopilot/src/autopilot/augmentation.py`
- Telemetry tracking: `src/systems/TelemetryTracker.ts`
- Autopilot system: `src/systems/AutopilotSystem.ts`
- Game scene: `src/scenes/GameScene.ts`
