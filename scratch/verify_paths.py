import time
import math
import json
from playwright.sync_api import sync_playwright

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1440, 'height': 900})
        page = context.new_page()

        print('Navigating to http://localhost:5173/...')
        page.goto('http://localhost:5173/')
        page.wait_for_selector('canvas', timeout=15000)
        time.sleep(2.0) # Wait for initial WebP frames to buffer

        # Test within the full visible 1440x900 viewport
        # Top 10% (y=90), Top 25% (y=225), Center (y=450), Bottom 25% (y=675), Bottom 10% (y=810)
        cx = 720.0
        cy = 450.0
        rx = 620.0 # Far left (x=100) to Far right (x=1340)
        ry = 360.0 # Top 10% (y=90) to Bottom 10% (y=810)

        # Helper to read debug HUD
        def get_debug_state():
            return page.evaluate('''() => {
                const hud = document.getElementById('debug-hud-panel');
                if (!hud) return null;
                const coords = document.getElementById('debug-hud-coords')?.innerText || '';
                const polar = document.getElementById('debug-hud-polar')?.innerText || '';
                const primary = document.getElementById('debug-hud-primary')?.innerText || '';
                const secondary = document.getElementById('debug-hud-secondary')?.innerText || '';
                const weights = document.getElementById('debug-hud-weights')?.innerText || '';
                const frameSpan = document.querySelector('#debug-hud-frame span')?.innerText || '';
                const dirPill = document.getElementById('hud-direction-label')?.innerText || '';
                return { coords, polar, primary, secondary, weights, frame: frameSpan, dirPill };
            }''')

        # Test Suite
        test_results = {}

        def execute_path(name, points, delay=0.02):
            print(f'\n--- Starting Path: {name} ({len(points)} steps) ---')
            frame_records = []
            blinks = 0
            
            for i, (px, py) in enumerate(points):
                page.mouse.move(px, py)
                time.sleep(delay)
                state = get_debug_state()
                if state and state.get('frame'):
                    f_text = state['frame']
                    # Extract frame number, e.g. "F62 (2.58s)"
                    try:
                        f_idx = int(f_text.split()[0].replace('F', ''))
                        frame_records.append({
                            'step': i,
                            'x': px,
                            'y': py,
                            'frame': f_idx,
                            'primary': state['primary'],
                            'secondary': state['secondary'],
                            'weights': state['weights'],
                            'dirPill': state['dirPill']
                        })
                        if 190 <= f_idx <= 196:
                            blinks += 1
                    except Exception:
                        pass
            
            frames = [r['frame'] for r in frame_records]
            min_f = min(frames) if frames else 0
            max_f = max(frames) if frames else 0
            
            # Check maximum step jump (excluding known Sector 3 bridge)
            jumps = [abs(frames[k+1] - frames[k]) for k in range(len(frames)-1)]
            non_bridge_jumps = [j for j in jumps if j < 140]
            max_step = max(non_bridge_jumps) if non_bridge_jumps else 0
            
            result = {
                'name': name,
                'total_samples': len(frames),
                'min_frame': min_f,
                'max_frame': max_f,
                'blinks': blinks,
                'max_step': max_step,
                'start_frame': frames[0] if frames else 0,
                'end_frame': frames[-1] if frames else 0,
                'sample_state': frame_records[len(frame_records)//2] if frame_records else None
            }
            test_results[name] = result
            print(f'Completed {name}: Samples={len(frames)}, Range=[{min_f}, {max_f}], Blinks={blinks}, MaxStep={max_step}')
            return result

        # A. Slow Clockwise Circle
        cw_points = []
        for a in [2 * math.pi * (1 - i / 100) for i in range(101)]:
            cw_points.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
        execute_path('A_Slow_CW_Circle', cw_points, delay=0.03)
        page.screenshot(path='scratch/path_A_cw.png')

        # B. Slow Counter-Clockwise Circle
        ccw_points = []
        for a in [2 * math.pi * (i / 100) for i in range(101)]:
            ccw_points.append((cx + rx * math.cos(a), cy + ry * math.sin(a)))
        execute_path('B_Slow_CCW_Circle', ccw_points, delay=0.03)

        # C. Figure-8
        f8_points = []
        for i in range(101):
            t = 2 * math.pi * (i / 100)
            f8_points.append((cx + rx * math.sin(t), cy + ry * math.sin(t) * math.cos(t)))
        execute_path('C_Figure_8', f8_points, delay=0.025)
        page.screenshot(path='scratch/path_C_figure8.png')

        # D. Top-Left -> Top-Right (top 10% & top 25%)
        tl_tr_points = []
        for i in range(60):
            frac = i / 59
            tl_tr_points.append((cx - rx + frac * 2 * rx, cy - ry * 0.85))
        execute_path('D_TopLeft_to_TopRight', tl_tr_points, delay=0.02)

        # E. Top-Right -> Bottom-Right (far right)
        tr_br_points = []
        for i in range(60):
            frac = i / 59
            tr_br_points.append((cx + rx * 0.95, cy - ry + frac * 2 * ry))
        execute_path('E_TopRight_to_BottomRight', tr_br_points, delay=0.02)

        # F. Bottom-Right -> Bottom-Left (bottom 10% & bottom 25%)
        br_bl_points = []
        for i in range(60):
            frac = i / 59
            br_bl_points.append((cx + rx - frac * 2 * rx, cy + ry * 0.85))
        execute_path('F_BottomRight_to_BottomLeft', br_bl_points, delay=0.02)

        # G. Bottom-Left -> Top-Left (far left)
        bl_tl_points = []
        for i in range(60):
            frac = i / 59
            bl_tl_points.append((cx - rx * 0.95, cy + ry - frac * 2 * ry))
        execute_path('G_BottomLeft_to_TopLeft', bl_tl_points, delay=0.02)

        # H. Center -> Extreme Top -> Center
        h_points = []
        for i in range(35):
            frac = i / 34
            h_points.append((cx, cy - frac * ry))
        for i in range(35):
            frac = i / 34
            h_points.append((cx, cy - ry + frac * ry))
        execute_path('H_Center_Top_Center', h_points, delay=0.02)

        # I. Center -> Extreme Bottom -> Center
        i_points = []
        for i in range(35):
            frac = i / 34
            i_points.append((cx, cy + frac * ry))
        for i in range(35):
            frac = i / 34
            i_points.append((cx, cy + ry - frac * ry))
        execute_path('I_Center_Bottom_Center', i_points, delay=0.02)

        # J. Rapid Left -> Right -> Left
        j_points = []
        for i in range(30):
            frac = i / 29
            j_points.append((cx - rx + frac * 2 * rx, cy))
        for i in range(30):
            frac = i / 29
            j_points.append((cx + rx - frac * 2 * rx, cy))
        execute_path('J_Rapid_Left_Right_Left', j_points, delay=0.015)

        # Print final comprehensive report
        print('\n' + '='*60)
        print('PATH VERIFICATION RESULTS SUMMARY:')
        print('='*60)
        for name, res in test_results.items():
            blink_flag = 'PASS (0 blinks)' if res['blinks'] == 0 else f'FAIL ({res["blinks"]} blinks)'
            print(f"{res['name']:28s} | Range: [{res['min_frame']:3d}, {res['max_frame']:3d}] | MaxStep: {res['max_step']:2d} | Blink: {blink_flag}")
        print('='*60)

        with open('scratch/path_test_report.json', 'w') as f:
            json.dump(test_results, f, indent=2)

        browser.close()

if __name__ == '__main__':
    run()
