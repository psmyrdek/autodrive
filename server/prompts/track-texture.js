export const TRACK_TEXTURE_PROMPT = `
Survey‑grade, nadir (90°) orthographic aerial orthophoto of a modern urban road network, ortho‑rectified geometry, zero keystone or parallax.
Empty asphalt and concrete streets, arterials and limited‑access highways with ramps, medians, shoulders, painted lane markings, crosswalks, manhole covers, drains, subtle patchwork and tar lines, fine asphalt aggregate and micro‑texture visible.
Surroundings: realistic building rooftops, sidewalks, curbs and gutters, parking lots, median plantings, trees, small parks and verges; utility poles and traffic lights permissible but unobtrusive.
Lighting: neutral daylight; soft, short shadows; low haze; uniform exposure; neutral white balance; natural color rendition.
Framing: perfect top‑down, 0° tilt/roll; edge‑to‑edge sharpness; GIS/cartography fidelity; no depth of field blur.
Absolutely no vehicles or people anywhere on the roadway surface; roads completely clear and unoccupied.
Ultra‑high resolution (4K–8K), photorealistic, clean, production‑quality orthophoto.
`;

export const TRACK_TEXTURE_NEGATIVE = `
vehicles, cars, trucks, buses, vans, motorcycles, bicycles, scooters, emergency vehicles, parked cars, car shadows, tire trails from moving cars,
people, pedestrians, crowds, runners, strollers,
animals, birds,

tilt, oblique view, diagonal perspective, keystone, perspective warp, parallax, camera roll, horizon line, drone tilt,
depth of field, bokeh, focus blur, motion blur, long exposure,
fisheye, wide‑angle distortion, lens flare, glare, vignetting, chromatic aberration,
overexposure, underexposure, crushed blacks, blown highlights, excessive HDR, oversaturated colors,

cartoon, illustration, drawing, anime, pixel art, voxel, low‑poly, game UI, stylized, CGI look, plastic skin, 3D render, synthetic,
map labels, text, numbers, lane text, watermarks, logos, brand marks, icons, arrows painted with words,

cloud cover, fog, heavy haze, rain, puddles, snow, ice, seasonal leaf clutter, fire, smoke,
construction equipment, cones, barriers, dumpsters, road closures, accidents, debris,

repeating artifacts, grid seams, obvious tiling, mismatched edges, moiré, compression artifacts, low resolution, pixelation,
incorrect scale (miniature cities, toy look), unrealistic materials, glossy asphalt, mirror‑like reflections,

dated aerial color grading, infrared/false‑color imagery, thermal look.
`;
