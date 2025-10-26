import { writeFile } from "fs/promises";
import Replicate from "replicate";
const replicate = new Replicate();

const input = {
    mask: "https://replicate.delivery/pbxt/M0gpLCYdCLbnhcz95Poy66q30XW9VSCN65DoDQ8IzdzlQonw/kill-bill-mask.png",
    image: "https://replicate.delivery/pbxt/M0gpKVE9wmEtOQFNDOpwz1uGs0u6nK2NcE85IihwlN0ZEnMF/kill-bill-poster.jpg",
    prompt: "movie poster says \"FLUX FILL\""
};

const output = await replicate.run("black-forest-labs/flux-fill-pro", { input });

// To access the file URL:
console.log(output.url());
//=> "https://replicate.delivery/.../output.jpg"

// To write the file to disk:
await writeFile("output.jpg", output);
//=> output.jpg written to disk