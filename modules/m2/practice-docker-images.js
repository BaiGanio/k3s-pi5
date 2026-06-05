// modules/m2/practice-docker-images.js
// Practice lab for the Standalone Containers group — build, run, and optimize images.
// Walks the three labs in modules/m2/labs/ as filterable sections:
//   1. hello-world   — build your first image (FROM/LABEL/ADD/CMD)
//   2. entrypoint-cmd — ENTRYPOINT vs CMD
//   3. nginx-layers  — image layers & the build cache
// All images here are multi-arch (busybox/ubuntu/alpine) and run natively on the
// M1 Pro (ARM64) exactly as they will on the Raspberry Pi 5 (also ARM64).

window.pageBlocks = [

  // ── Intro ──────────────────────────────────────────────────────────────────
  {
    type: 'prose',
    title: 'What you will learn',
    content: `
      <p>
        An <strong>image</strong> is the unit you ship in the container world — and everything you
        deploy later on Docker, the Raspberry Pi, or k3s is built from one. These three short labs
        take you from writing your very first <code>Dockerfile</code> to genuinely understanding how
        an image is put together and how it behaves when it runs. By the end you will be able to:
      </p>
      <ul>
        <li><strong>Author a Dockerfile</strong> from scratch — <code>FROM</code>, <code>LABEL</code>, <code>ADD</code>/<code>COPY</code>, <code>CMD</code> — and build it into a tagged image you can run.</li>
        <li><strong>Control what a container runs</strong> — explain the difference between <code>ENTRYPOINT</code> and <code>CMD</code>, and override a container's command at run time.</li>
        <li><strong>Read and optimize image structure</strong> — see how each instruction becomes a layer, why instruction order matters for the build cache, and how to avoid the classic stale-package trap.</li>
        <li><strong>Run and expose a real service</strong> — publish a container's port and reach it from your Mac.</li>
      </ul>
    `,
  },
  {
    type: 'prose',
    title: 'Why this matters',
    content: `
      <p>
        Almost everyone starts by copy-pasting Dockerfiles they do not fully understand — and then
        gets stung when a build is mysteriously slow, an image is needlessly huge, or
        <code>docker run</code> ignores the argument they passed. These labs exist to replace that
        guesswork with a real mental model: <em>an image is just a stack of layers, and a container
        is one process started from that stack.</em> Once that clicks, debugging builds and writing
        lean, correct images stops being guesswork.
      </p>
      <p>
        Each lab is deliberately tiny so the concept is the only thing in view. You will type the
        files yourself (they also live under <code>modules/m2/labs/</code> for reference), build them,
        and run them — because the lesson lands when you watch the output, not when you read about it.
      </p>
    `,
  },
  {
    type: 'note',
    variant: 'info',
    content: 'Run these on your <strong>M1 Pro</strong> with any Docker-compatible CLI — Docker Desktop, <a href="https://github.com/abiosoft/colima">colima</a>, or <code>nerdctl</code> (see the <em>Nerdctl</em> module — every <code>docker</code> command below works as <code>nerdctl</code> too). All images are multi-arch, so Docker pulls the <code>arm64</code> variant and everything runs natively — no emulation. The same Dockerfiles build identically on the Raspberry Pi 5, which is also ARM64.',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LAB 1 — HELLO WORLD
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Lab 1 — Build your first image',
    content: `
      <p>
        The goal here is to <strong>learn the anatomy of a Dockerfile</strong> by writing the
        smallest possible real one, and to <strong>practice the build-and-run cycle</strong> you will
        repeat for every workload from now on. You will build an image from <code>busybox</code>
        (a tiny ~4 MB Linux toolbox) that copies in a shell script and runs it as the container's
        default command — proving that you can package your own code into a runnable image.
      </p>
      <p>Two files in <code>labs/hello-world/</code>:</p>
      <ul>
        <li><code>welcome-dob.sh</code> — prints a short welcome banner</li>
        <li><code>Dockerfile</code> — <code>FROM busybox</code>, labels, <code>ADD</code> the script, <code>CMD</code> to run it</li>
      </ul>
    `,
  },
  {
    type: 'commands',
    section: 'hello',
    sectionTitle: 'Lab 1 — Hello World image',
    items: [
      {
        id: 1,
        commandTitle: 'Write the welcome script',
        command: 'cat welcome-dob.sh',
        searchTerms: 'welcome script sh echo banner busybox hello world create file',
        description: 'In a folder named <code>hello-world</code>, create <code>welcome-dob.sh</code> with the content below. It is the program the container will run.',
        parts: [
          { text: '#!/bin/sh', explanation: 'busybox ships an sh shell (not bash), so the script targets POSIX sh' },
          { text: 'echo ...', explanation: 'prints the banner lines to stdout — which Docker streams back to your terminal' },
          { text: 'exit 0', explanation: 'exits cleanly; the container stops as soon as this script returns' },
        ],
        example: `#!/bin/sh

echo ""
echo "  k3s-pi5 — Module 2"
echo "  Docker & Container Runtimes"
echo ""
echo "  k3s on Raspberry Pi 5"
echo "  https://baiganio.github.io/k3s-pi5"
echo ""

exit 0`,
        why: "A container runs one foreground process. Here that process is this script — when it exits, the container exits. This is the simplest possible 'the image does something' demo.",
      },
      {
        id: 2,
        commandTitle: 'Write the Dockerfile',
        command: 'cat Dockerfile',
        searchTerms: 'dockerfile from busybox label add cmd build instruction maintainer version',
        description: 'Create <code>Dockerfile</code> next to the script. It starts from <code>busybox</code>, attaches metadata labels, copies the script into the image root, and sets it as the default command.',
        parts: [
          { text: 'FROM busybox', explanation: 'the base image every later layer builds on — a minimal Linux userland' },
          { text: 'LABEL version=... description=... maintainer=...', explanation: 'free-form metadata baked into the image; visible later via docker image inspect' },
          { text: 'ADD welcome-dob.sh /', explanation: 'copies the script from the build context into the image at /welcome-dob.sh' },
          { text: 'CMD ["./welcome-dob.sh"]', explanation: 'the default command run when the container starts (exec form — no shell wrapping)' },
        ],
        example: `FROM busybox
LABEL version="2.0" description="Hello World image built for Module 2 of the k3s-pi5 hands-on labs" maintainer="k3s-pi5@admin.pro"
ADD welcome-dob.sh /
CMD ["./welcome-dob.sh"]`,
        why: "Each instruction is a build step. Reading top to bottom tells you the whole story of the image: where it starts, what metadata it carries, what files it adds, and what it runs.",
      },
      {
        id: 3,
        commandTitle: 'Build the image',
        command: 'docker build -t welcome-dob:2.0 .',
        searchTerms: 'docker build tag image context dot buildkit hello world',
        description: 'Builds an image from the <code>Dockerfile</code> in the current directory and tags it <code>welcome-dob:2.0</code>. The trailing <code>.</code> is the build context — the set of files Docker can <code>ADD</code>/<code>COPY</code> from.',
        parts: [
          { text: 'docker build', explanation: 'reads the Dockerfile and produces an image, executing each instruction as a layer' },
          { text: '-t welcome-dob:2.0', explanation: 'names (tags) the resulting image name:tag so you can reference it by a friendly name' },
          { text: '.', explanation: 'the build context — the current directory; this is where welcome-dob.sh is found' },
        ],
        example: "[+] Building 2.1s (7/7) FINISHED\n => [internal] load build definition from Dockerfile\n => [internal] load metadata for docker.io/library/busybox:latest\n => [1/2] FROM docker.io/library/busybox\n => [2/2] ADD welcome-dob.sh /\n => exporting to image\n => => naming to docker.io/library/welcome-dob:2.0",
        why: "The tag is how you refer to the image when running it. Without -t you'd get an untagged image identified only by a long hash, which is awkward to use.",
      },
      {
        id: 4,
        commandTitle: 'Run the container',
        command: 'docker run --rm welcome-dob:2.0',
        searchTerms: 'docker run rm welcome image cmd script output banner',
        description: 'Creates and runs a container from your image. With no command argument, Docker runs the image\'s <code>CMD</code> — your script — which prints the banner and exits.',
        parts: [
          { text: 'docker run', explanation: 'creates a container from the image and starts it' },
          { text: '--rm', explanation: 'removes the container automatically when it exits, so short-lived runs leave nothing behind' },
          { text: 'welcome-dob:2.0', explanation: 'the image to run — the one you just built and tagged' },
        ],
        example: "\n  k3s-pi5 — Module 2\n  Docker & Container Runtimes\n\n  k3s on Raspberry Pi 5\n  https://baiganio.github.io/k3s-pi5\n",
        why: "This closes the loop: you wrote a script, baked it into an image, and ran it as a container. That is the core build-and-run cycle you'll repeat for every workload.",
      },
      {
        id: 5,
        commandTitle: 'Inspect the labels you set',
        command: 'docker image inspect welcome-dob:2.0 --format \'{{json .Config.Labels}}\'',
        searchTerms: 'docker image inspect labels metadata format json config',
        description: 'Reads back the <code>LABEL</code> metadata you baked into the image. Labels are how you attach version, ownership, and description info that tools and humans can query later.',
        parts: [
          { text: 'docker image inspect', explanation: 'dumps the full low-level metadata of an image as JSON' },
          { text: "--format '{{json .Config.Labels}}'", explanation: 'a Go template that extracts just the Labels map instead of the whole document' },
        ],
        example: '{"description":"Hello World image built for Module 2 of the k3s-pi5 hands-on labs","maintainer":"k3s-pi5@admin.pro","version":"2.0"}',
        why: "Labels are not decoration — registries, CI systems, and orchestration tools read them. Knowing how to set and query them is a basic image-hygiene skill.",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LAB 2 — ENTRYPOINT vs CMD
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Lab 2 — ENTRYPOINT vs CMD',
    content: `
      <p>
        These two instructions confuse almost everyone at first — and getting them wrong is why a
        container sometimes ignores the argument you passed, or refuses to run the command you
        expected. The rule is simple once you see it:
      </p>
      <ul>
        <li><strong><code>ENTRYPOINT</code></strong> is the executable — the fixed part of the command that always runs.</li>
        <li><strong><code>CMD</code></strong> is the default <em>arguments</em> to that executable — the part you can override.</li>
      </ul>
      <p>
        When you pass arguments to <code>docker run &lt;image&gt; ...</code>, they <strong>replace CMD</strong>
        but leave ENTRYPOINT in place. You will <em>learn</em> this rule and then <em>practice</em> it by
        building a container that wraps <code>ping</code>: ENTRYPOINT pins it to <code>ping -c 4</code>,
        CMD provides a default host to ping, and you will override that host at run time. Lab files in
        <code>labs/entrypoint-cmd/</code>.
      </p>
    `,
  },
  {
    type: 'commands',
    section: 'entrypoint',
    sectionTitle: 'Lab 2 — ENTRYPOINT vs CMD',
    items: [
      {
        id: 101,
        commandTitle: 'Write the Dockerfile',
        command: 'cat Dockerfile',
        searchTerms: 'dockerfile entrypoint cmd ping busybox arguments override exec form',
        description: 'In a folder named <code>entrypoint-cmd</code>, create this <code>Dockerfile</code>. <code>ENTRYPOINT</code> fixes <code>ping -c 4</code>; <code>CMD</code> supplies a default target that you can override at run time.',
        parts: [
          { text: 'FROM busybox', explanation: 'busybox includes a ping applet, so no extra install is needed' },
          { text: 'ENTRYPOINT ["ping", "-c", "4"]', explanation: 'the fixed command — always runs ping with a count of 4; run arguments cannot change it' },
          { text: 'CMD ["baiganio.github.io"]', explanation: 'the default argument appended to ENTRYPOINT — the host to ping, replaced when you pass your own argument to docker run' },
        ],
        example: `FROM busybox
LABEL description="ENTRYPOINT vs CMD demo" maintainer="k3s-pi5@admin.pro"
ENTRYPOINT ["ping", "-c", "4"]
CMD ["baiganio.github.io"]`,
        why: "Using ENTRYPOINT + CMD together is the idiomatic pattern for a container that is really 'one tool with a default argument' — like a CLI you can call with or without overriding the target.",
      },
      {
        id: 102,
        commandTitle: 'Build the image',
        command: 'docker build -t ping-demo .',
        searchTerms: 'docker build ping-demo entrypoint cmd image tag',
        description: 'Builds the image and tags it <code>ping-demo</code>. (No version tag means it defaults to <code>:latest</code>.)',
        parts: [
          { text: 'docker build -t ping-demo .', explanation: 'builds from the Dockerfile in the current directory and names the image ping-demo:latest' },
        ],
        example: "[+] Building 1.4s (6/6) FINISHED\n => => naming to docker.io/library/ping-demo:latest",
        why: "A tiny image to experiment with — the interesting part is what happens at run time, not build time.",
      },
      {
        id: 103,
        commandTitle: 'Run with the default CMD',
        command: 'docker run --rm ping-demo',
        searchTerms: 'docker run default cmd entrypoint ping no arguments combine',
        description: 'With no run arguments, Docker combines the two instructions into one command: <code>ENTRYPOINT</code> + <code>CMD</code> = <code>ping -c 4 baiganio.github.io</code>. So the container pings the project site four times and exits.',
        parts: [
          { text: 'docker run --rm ping-demo', explanation: "no trailing arguments, so the image's CMD (baiganio.github.io) is used as the default target" },
        ],
        example: "PING baiganio.github.io (185.199.108.153): 56 data bytes\n64 bytes from 185.199.108.153: seq=0 ttl=57 time=9.8 ms\n64 bytes from 185.199.108.153: seq=1 ttl=57 time=9.6 ms\n64 bytes from 185.199.108.153: seq=2 ttl=57 time=9.7 ms\n64 bytes from 185.199.108.153: seq=3 ttl=57 time=9.9 ms\n\n--- baiganio.github.io ping statistics ---\n4 packets transmitted, 4 packets received, 0% packet loss",
        why: "This shows the two instructions working together: ENTRYPOINT decides what runs (ping -c 4), CMD supplies the default thing it acts on (baiganio.github.io). Run the image with no arguments and you get that sensible default.",
      },
      {
        id: 104,
        commandTitle: 'Override CMD with your own argument',
        command: 'docker run --rm ping-demo 1.1.1.1',
        searchTerms: 'docker run override cmd argument entrypoint ping ip address replace',
        description: 'Anything after the image name <strong>replaces CMD</strong> but keeps ENTRYPOINT. So instead of the default <code>baiganio.github.io</code>, the command becomes <code>ping -c 4 1.1.1.1</code> — your argument took the place of the default target.',
        parts: [
          { text: 'ping-demo', explanation: 'the image — its ENTRYPOINT (ping -c 4) stays fixed' },
          { text: '1.1.1.1', explanation: 'your argument — replaces the default CMD, becoming the ping target' },
        ],
        example: "PING 1.1.1.1 (1.1.1.1): 56 data bytes\n64 bytes from 1.1.1.1: seq=0 ttl=56 time=11.6 ms\n64 bytes from 1.1.1.1: seq=1 ttl=56 time=12.0 ms\n64 bytes from 1.1.1.1: seq=2 ttl=56 time=11.8 ms\n64 bytes from 1.1.1.1: seq=3 ttl=56 time=11.9 ms\n\n--- 1.1.1.1 ping statistics ---\n4 packets transmitted, 4 packets received, 0% packet loss",
        why: "This is the whole point of the pattern: the container is locked to one tool (ping -c 4) but its target is configurable at run time. ENTRYPOINT = what it is; CMD = the default of what it acts on.",
      },
    ],
  },

  // ════════════════════════════════════════════════════════════════════════════
  // LAB 3 — IMAGE LAYERS & BUILD CACHE
  // ════════════════════════════════════════════════════════════════════════════
  {
    type: 'prose',
    title: 'Lab 3 — Image layers & the build cache',
    content: `
      <p>
        Every <code>RUN</code>, <code>COPY</code>, and <code>ADD</code> instruction adds a
        <strong>layer</strong> to the image. Docker caches each layer and reuses it on the next build
        if nothing above it changed — that cache is why a second build is so much faster than the
        first. But more layers also mean more metadata, and with package managers, splitting steps
        across layers opens the door to a subtle stale-data bug.
      </p>
      <p>
        In this lab you will <strong>learn</strong> how layers and the build cache work, then
        <strong>practice</strong> spotting the difference by building two nginx images that are
        identical except for how the install is split across <code>RUN</code> instructions:
      </p>
      <ul>
        <li><strong>nginx-1</strong> — <code>apt-get update</code> and <code>apt-get install</code> as <em>two separate</em> <code>RUN</code> lines (more layers, cache trap).</li>
        <li><strong>nginx-2</strong> — both chained in <em>one</em> <code>RUN</code> with <code>&amp;&amp;</code> (fewer layers, always-fresh index).</li>
      </ul>
      <p>You will build both, compare their layers with <code>docker image history</code>, then run one and reach it from your Mac. Lab files in <code>labs/nginx-layers/</code>.</p>
    `,
  },
  {
    type: 'note',
    variant: 'warning',
    content: 'The <strong>two-RUN</strong> version (nginx-1) is the classic Docker anti-pattern. Because <code>apt-get update</code> sits in its own cached layer, a later rebuild can reuse a <em>stale</em> package index while <code>apt-get install</code> runs against it — pulling outdated or missing packages. Always chain <code>update &amp;&amp; install</code> in a single <code>RUN</code> (the nginx-2 way).',
  },
  {
    type: 'commands',
    section: 'layers',
    sectionTitle: 'Lab 3 — Layers & build cache',
    items: [
      {
        id: 201,
        commandTitle: 'Review the two Dockerfiles',
        command: 'cat nginx-1/Dockerfile nginx-2/Dockerfile',
        searchTerms: 'dockerfile nginx ubuntu run apt-get update install layers compare entrypoint expose',
        description: 'Both produce a working nginx image. The only difference is how the install is split across <code>RUN</code> instructions — and that changes the layer count.',
        parts: [
          { text: 'FROM ubuntu', explanation: 'base image for both — the arm64 variant on Apple Silicon / Pi' },
          { text: 'RUN apt-get update / RUN apt-get install -y nginx  (nginx-1)', explanation: 'two RUN lines → two extra layers, and a cache-staleness risk between them' },
          { text: 'RUN apt-get update && apt-get install -y nginx  (nginx-2)', explanation: 'one RUN → one layer; update and install always run together, so the index is never stale' },
          { text: 'ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]', explanation: 'runs nginx in the foreground so the container stays alive (containers exit when PID 1 exits)' },
          { text: 'EXPOSE 80', explanation: 'documents that the container listens on port 80 — informational only; it does not publish the port' },
        ],
        example: `==> nginx-1/Dockerfile
FROM ubuntu
LABEL maintainer="k3s-pi5@admin.pro" description="nginx image — one layer per RUN (unoptimized)"
RUN apt-get update
RUN apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80

==> nginx-2/Dockerfile
FROM ubuntu
LABEL maintainer="k3s-pi5@admin.pro" description="nginx image — update+install chained in one RUN (optimized)"
RUN apt-get update && apt-get install -y nginx
ENTRYPOINT ["/usr/sbin/nginx","-g","daemon off;"]
EXPOSE 80`,
        why: "Reading both side by side makes the only real difference obvious: instruction count. Everything else is identical, which isolates the lesson to layering.",
      },
      {
        id: 202,
        commandTitle: 'Build both images',
        command: 'docker build -t nginx-layers:v1 nginx-1 && docker build -t nginx-layers:v2 nginx-2',
        searchTerms: 'docker build nginx-1 nginx-2 two images tag v1 v2 context subdirectory',
        description: 'Builds each Dockerfile from its own subfolder. Here the build context argument is a directory name (<code>nginx-1</code> / <code>nginx-2</code>) rather than <code>.</code>.',
        parts: [
          { text: 'docker build -t nginx-layers:v1 nginx-1', explanation: 'builds nginx-1/Dockerfile, tagging the result v1' },
          { text: 'docker build -t nginx-layers:v2 nginx-2', explanation: 'builds nginx-2/Dockerfile, tagging the result v2' },
        ],
        example: "[+] Building 18.2s (8/8) FINISHED   => naming to docker.io/library/nginx-layers:v1\n[+] Building 16.9s (7/7) FINISHED   => naming to docker.io/library/nginx-layers:v2",
        why: "Tagging them v1 and v2 lets you compare the two builds directly with the same image name.",
      },
      {
        id: 203,
        commandTitle: 'Compare the layers',
        command: 'docker image history nginx-layers:v1 && docker image history nginx-layers:v2',
        searchTerms: 'docker image history layers compare count run apt size optimization',
        description: 'Shows the layer-by-layer history of each image. <code>v1</code> has a separate layer for <code>apt-get update</code> and another for <code>apt-get install</code>; <code>v2</code> collapses both into a single layer.',
        parts: [
          { text: 'docker image history', explanation: 'lists every layer of an image, newest first, with the instruction that created it and its size' },
        ],
        example: "# nginx-layers:v1\nIMAGE     CREATED BY                                      SIZE\n...       ENTRYPOINT [\"/usr/sbin/nginx\" \"-g\" \"daemon ...   0B\n...       RUN /bin/sh -c apt-get install -y nginx          61MB\n...       RUN /bin/sh -c apt-get update                    42MB\n...       /bin/sh -c #(nop) FROM ubuntu                    78MB\n\n# nginx-layers:v2\nIMAGE     CREATED BY                                      SIZE\n...       ENTRYPOINT [\"/usr/sbin/nginx\" \"-g\" \"daemon ...   0B\n...       RUN /bin/sh -c apt-get update && apt-get ins...  101MB\n...       /bin/sh -c #(nop) FROM ubuntu                    78MB",
        why: "v1 shows two RUN layers; v2 shows one. Fewer layers means less metadata overhead — and, more importantly, update+install in one layer guarantees the package index is fresh every build.",
      },
      {
        id: 204,
        commandTitle: 'Run nginx and verify it serves',
        command: 'docker run -d -p 8080:80 --name web nginx-layers:v2 && curl -s localhost:8080 | head -n 5',
        searchTerms: 'docker run detached publish port nginx curl localhost 8080 expose verify serve',
        description: 'Runs the v2 image in the background, publishing container port 80 to <code>localhost:8080</code> on your Mac, then fetches the default nginx page to confirm it serves.',
        parts: [
          { text: '-d', explanation: 'detached — runs the container in the background and returns your prompt' },
          { text: '-p 8080:80', explanation: 'publishes container port 80 to host port 8080; this is what actually exposes the service (EXPOSE alone does not)' },
          { text: '--name web', explanation: 'gives the container a friendly name so you can stop/remove it by name' },
          { text: 'curl -s localhost:8080 | head -n 5', explanation: 'requests the page quietly and prints the first 5 lines of HTML' },
        ],
        example: "<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n<style>",
        why: "EXPOSE 80 is only documentation — the -p flag is what maps the port so your Mac can reach the container. Seeing the nginx welcome page confirms the image you built actually works.",
      },
      {
        id: 205,
        commandTitle: 'Clean up the running container',
        command: 'docker rm -f web',
        searchTerms: 'docker rm force remove stop container cleanup web nginx',
        description: 'Stops and removes the detached nginx container. (The <code>--rm</code> containers from the earlier labs cleaned themselves up; this detached one does not.)',
        parts: [
          { text: 'docker rm -f web', explanation: 'force-removes the container named web, stopping it first if it is still running' },
        ],
        example: "web",
        why: "Detached containers keep running and holding port 8080 until you remove them. Cleaning up frees the port and avoids name clashes the next time you run --name web.",
      },
    ],
  },

];
