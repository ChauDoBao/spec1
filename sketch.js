// Arrays to keep track of everything on screen
let nodes = []; // The dots/points
let edges = []; // The lines connecting nodes
let faces = []; // The triangles formed by 3 nodes
let pulses = []; // The flying energy particles

// Settings for the network layout
const numNodes = 45; 
const connectionDistance = 180; // This is the 'range' for nodes to find friends
let centerX, centerY, coreRadius;

function setup() {
  // 1. Putting the canvas into the HTML container I made
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.parent('canvas-container'); 

  // 2. Finding the middle of the screen
  centerX = width * 0.5;
  centerY = height * 0.5;
  
  // 3. coreRadius makes sure the network stays centered but spreads out enough
  coreRadius = min(width, height) * 0.5; 

  // 4. Resetting everything so it doesn't double up on refresh
  nodes = [];
  edges = [];
  faces = [];
  pulses = [];

  // 5. A loop that runs 45 times (numNodes) to create our points
for (let i = 0; i < numNodes; i++) {
  
  // Pick a random direction in a full circle (TWO_PI is 360 degrees in radians)
  let angle = random(TWO_PI); 
  
  // Decide how far from the center the node should be. 
  // The 'if' logic (random > 0.7) makes 30% of them scatter further out, 
  // which makes the cluster look more natural and less like a perfect circle.
  let r = random(coreRadius * (random() > 0.7 ? 1.2 : 0.8)); 
  
  // Trigonometry: Convert that 'angle' and 'distance' into X and Y screen coordinates
  // centerX and centerY are the starting points so the network stays centered
  let x = centerX + r * cos(angle);
  let y = centerY + r * sin(angle);
  
  // Take those coordinates and create a new 'Node' object, then save it in our array
  nodes.push(new Node(x, y));
}

// 6. Start looking at every node one by one (this is Node 'A')
for (let i = 0; i < nodes.length; i++) {
  
  // Start another loop to look at every OTHER node (this is Node 'B')
  // We use 'j = i + 1' so we don't compare a node to itself or check the same pair twice
  for (let j = i + 1; j < nodes.length; j++) {
    
    // Use the dist() function to find the physical distance between Node A and Node B
    let d = dist(nodes[i].anchor.x, nodes[i].anchor.y, nodes[j].anchor.x, nodes[j].anchor.y);
    
    // If they are closer than 180 pixels (connectionDistance), they become 'edges' (a line)
    if (d < connectionDistance) {
      // Store this pair in the edges array so we can draw the line later in draw()
      edges.push({ a: nodes[i], b: nodes[j], dist: d });
      
      // 3. Now, look for a THIRD node (Node 'C') to see if we can make a triangle
      for (let k = j + 1; k < nodes.length; k++) {
        // Calculate the distance from A to C and B to C
        let d2 = dist(nodes[i].anchor.x, nodes[i].anchor.y, nodes[k].anchor.x, nodes[k].anchor.y);
        let d3 = dist(nodes[j].anchor.x, nodes[j].anchor.y, nodes[k].anchor.x, nodes[k].anchor.y);
        
        // If all three nodes are within range of each other, they form a 'face' (a triangle)
        if (d2 < connectionDistance && d3 < connectionDistance) {
          // Store all three nodes together as a partnership unit
          faces.push({ a: nodes[i], b: nodes[j], c: nodes[k] });
        }
      }
    }
  }
}
}

function draw() {
  background(0); // Space-like black background

  // 7. Normal blending for the main structure (lines and triangles)
  blendMode(BLEND);
  
  // 8. Draw the blue triangle fills (only when they have 'power')
  noStroke();
  for (let f of faces) {
    // Face power is only > 0 if all three nodes are connected/powered
    let facePower = min(f.a.powerLevel, min(f.b.powerLevel, f.c.powerLevel));
    if (facePower > 0) {
      fill(40, 55, 90, 180 * facePower); // Deep blue fill
      triangle(f.a.pos.x, f.a.pos.y, f.b.pos.x, f.b.pos.y, f.c.pos.x, f.c.pos.y);
    }
  }

  // 9. Draw the connecting lines (the edges)
  for (let e of edges) {
    let edgePower = min(e.a.powerLevel, e.b.powerLevel);
    // map() makes shorter lines brighter than long ones
    let baseAlpha = map(e.dist, 0, connectionDistance * 0.5, 80, 0, true); 
    // lerp() smoothly animates the alpha from base to 200 when powered
    let alpha = lerp(baseAlpha, 200, edgePower);
    
    // Lines get a bit thicker when they are "powered up"
    let weight = lerp(2, 2.5, edgePower); 
    
    if (alpha > 2) { 
      strokeWeight(weight);
      stroke(180, 199, 242, alpha);
      line(e.a.pos.x, e.a.pos.y, e.b.pos.x, e.b.pos.y);
    }
  }

  // 10. Use ADD blend mode to make the energy glows look really bright
  blendMode(ADD);
  
  // 11. Update and show the energy pulses flying in
  for (let i = pulses.length - 1; i >= 0; i--) {
    pulses[i].update();
    pulses[i].display();
  }
  
  // 12. Draw each node and its V-shape/Triangle state
  for (let node of nodes) {
    node.update();
    node.display();
    node.drawV();
  }

  blendMode(BLEND);
}

function mousePressed() {
  // 13. Find the closest node that hasn't been powered up yet
  let validNodes = nodes.filter(n => !n.isPowered && !n.isCharging);
  if (validNodes.length === 0) return;
  
  let closest = validNodes[0];
  let minDist = dist(mouseX, mouseY, closest.pos.x, closest.pos.y);
  
  for (let i = 1; i < validNodes.length; i++) {
    let d = dist(mouseX, mouseY, validNodes[i].pos.x, validNodes[i].pos.y);
    if (d < minDist) { minDist = d; closest = validNodes[i]; }
  }
  
  // 14. Pick some neighbors to receive energy at the same time
  let targets = [closest];
  let neighbors = validNodes.filter(n => n !== closest && dist(n.pos.x, n.pos.y, closest.pos.x, closest.pos.y) < connectionDistance * 1.2);
  
  for (let i = 0; i < min(2, neighbors.length); i++) { 
    targets.push(neighbors[i]); 
  }
  
  // 15. Launch the energy pulses from outside the screen
  for (let target of targets) { 
    pulses.push(new EnergyPulse(target)); 
  }
}

// 16. Class to handle the energy flying in from "outside" sources
class EnergyPulse {
  constructor(target) {
    let angle = random(TWO_PI);
    let r = max(width, height) * 1.2; 
    // Pulses start far away to look like resources coming from the global network
    this.startPos = createVector(centerX + cos(angle) * r, centerY + sin(angle) * r);
    this.target = target;
    this.progress = 0; // 0 means just started, 1 means arrived
    this.transferProgress = 0; 
    this.speed = random(0.002, 0.004); 
    this.transferSpeed = 0.006; 
  }

  update() {
    // Phase 1: Flying to the node
    if (this.progress < 1) { 
      this.progress += this.speed; 
    } 
    // Phase 2: Charging the node once it arrives
    else if (this.transferProgress < 1) { 
      this.transferProgress += this.transferSpeed; 
      this.target.charge(this.transferProgress); 
    } 
    // Phase 3: Finally powering up the node forever
    else if (!this.target.isPowered) { 
      this.target.powerUp(); 
    }
  }

  display() {
    // Find the current position along the path using lerp
    let currentPos = p5.Vector.lerp(this.startPos, this.target.pos, this.progress);
    strokeWeight(1); stroke(180, 199, 242, 40);
    line(this.startPos.x, this.startPos.y, currentPos.x, currentPos.y);

    if (this.progress < 1) {
      this.drawGlow(currentPos.x, currentPos.y, 16, 0.7);
    } 
    else if (this.transferProgress < 1) {
      // Draw little 'packets' of energy flowing during the charge phase
      for (let i = 0; i < 3; i++) {
        let p = ((frameCount * 0.003) + (i * 0.33)) % 1;
        let pktX = lerp(this.startPos.x, this.target.pos.x, p);
        let pktY = lerp(this.startPos.y, this.target.pos.y, p);
        this.drawGlow(pktX, pktY, 8, 0.5);
      }
    }
  }

  // 17. Helper function to draw a glow using a radial gradient
  drawGlow(x, y, radius, intensity) {
    let grad = drawingContext.createRadialGradient(x, y, 0, x, y, radius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${intensity})`);
    grad.addColorStop(0.3, `rgba(180, 199, 242, ${intensity * 0.5})`);
    grad.addColorStop(1, 'rgba(81, 117, 185, 0)');
    drawingContext.fillStyle = grad; 
    noStroke(); 
    circle(x, y, radius * 2);
  }
}

// 18. Class for the individual nodes in the network
class Node {
  constructor(x, y) {
    this.anchor = createVector(x, y); // The target spot
    this.pos = createVector(x, y); // Current animated spot
    
    // Noise offsets so each node shakes differently
    this.noiseOffsetX = random(1000); this.noiseOffsetY = random(2000);
    this.size = random(1.5, 3.5);
    this.isCharging = false; this.isPowered = false;
    this.chargeLevel = 0; this.powerLevel = 0; 
    this.glowRadius = this.size * 2; 
  }
  
  update() {
    let currentJitter;
    let movementSpeed;

    if (this.isPowered) {
      // Stability: No jitter when powered
      currentJitter = 0; movementSpeed = 0; this.powerLevel = 1; 
    } else {
      // Instability: Use lerp to slow down the shaking while charging
      currentJitter = this.isCharging ? lerp(18, 5, this.chargeLevel) : 18;
      movementSpeed = this.isCharging ? 0.005 : 0.015;
    }

    // Map noise values to screen coordinates for the jitter effect
    this.pos.x = this.anchor.x + map(noise(this.noiseOffsetX), 0, 1, -currentJitter, currentJitter);
    this.pos.y = this.anchor.y + map(noise(this.noiseOffsetY), 0, 1, -currentJitter, currentJitter);
    this.noiseOffsetX += movementSpeed; 
    this.noiseOffsetY += movementSpeed;
  }
  
  // 19. Drawing the incomplete "V" shapes that become triangles
  drawV() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // Map opacity from 80% to 100% based on energy
    let alpha = this.isPowered ? 255 : map(this.chargeLevel, 0, 1, 204, 255);
    let sw = (this.isPowered || this.isCharging) ? 2.5 : 1; 
    strokeWeight(sw);
    
    // Transition color from White to Light Blue
    let stateProgress = this.isPowered ? 1 : this.chargeLevel;
    let rVal = lerp(255, 180, stateProgress);
    let gVal = lerp(255, 199, stateProgress);
    let bVal = lerp(255, 242, stateProgress);
    stroke(rVal, gVal, bVal, alpha);
    
    // Scale size up based on energy status
    let sizeScale = lerp(5, 7.5, stateProgress);
    let r = this.size * sizeScale; 
    
    let p1 = {x: 0, y: -r};
    let p2 = {x: -r * 0.86, y: r * 0.5};
    let p3 = {x: r * 0.86, y: r * 0.5};

    noFill();
    
    if (this.isPowered) {
        // CLOSE triangle when partnership is solid
        beginShape();
        vertex(p1.x, p1.y);
        vertex(p2.x, p2.y);
        vertex(p3.x, p3.y);
        endShape(CLOSE);
    } else {
        // Open 'V' shape when incomplete
        line(p1.x, p1.y, p2.x, p2.y);
        line(p1.x, p1.y, p3.x, p3.y);
    }

    // Little dots at the vertices
    if (this.isPowered || alpha > 60) {
        noStroke();
        fill(255, alpha);
        ellipse(p1.x, p1.y, 2.5, 2.5);
        ellipse(p2.x, p2.y, 2.5, 2.5);
        ellipse(p3.x, p3.y, 2.5, 2.5);
    }
    pop();
  }

  charge(amount) {
    this.isCharging = true; this.chargeLevel = amount;
    // Pulsing effect for the glow radius
    this.glowRadius = this.size * 2 + sin(frameCount * 0.1) * 3 + (amount * 5);
  }
  
  powerUp() {
    this.isCharging = false; this.isPowered = true;
    this.chargeLevel = 0; this.powerLevel = 1; 
    this.glowRadius = this.size * 9; 
  }
  
  // 20. Draw the soft radial glow behind the node
  display() {
    let coreAlpha = this.isPowered ? 0.9 : 0.15 + (this.chargeLevel * 0.5);
    let innerAlpha = this.isPowered ? 0.6 : 0.05 + (this.chargeLevel * 0.4);
    let grad = drawingContext.createRadialGradient(this.pos.x, this.pos.y, 0, this.pos.x, this.pos.y, this.glowRadius);
    grad.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);      
    grad.addColorStop(0.2, `rgba(180, 199, 242, ${innerAlpha})`); 
    grad.addColorStop(1, 'rgba(81, 117, 185, 0)');       
    drawingContext.fillStyle = grad; 
    noStroke();
    circle(this.pos.x, this.pos.y, this.glowRadius * 2);
  }
}

// 21. Refresh the canvas if the browser window changes size
function windowResized() { resizeCanvas(windowWidth, windowHeight); setup(); }