
window.onload = function() {
    // Get the canvas and context
    var canvas = document.getElementById("viewport");
    var context = canvas.getContext("2d");
    
    // Timing/second
    var lastframe = 0;
    var fpstime = 0;
    var framecount = 0;
    var fps = 0;
    
    var initialized = false;
    
    // Level
    var level = {
        x: 4,          
        y: 83,        
        width: 0,      
        height: 0,     
        columns: 15,   
        rows: 14,      
        tilewidth: 40,  
        tileheight: 40, 
        rowheight: 34,  
        radius: 20,    
        tiles: []    
    };

    // Define a tile class
    var Tile = function(x, y, type, shift) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.removed = false;
        this.shift = shift;
        this.velocity = 0;
        this.alpha = 1;
        this.processed = false;
    };
    
    // Player
    var player = {
        x: 0,
        y: 0,
        angle: 0,
        tiletype: 0,
        bubble: {
                    x: 0,
                    y: 0,
                    angle: 0,
                    speed: 1000,
                    dropspeed: 900,
                    tiletype: 0,
                    visible: false
                },
        nextbubble: {
                        x: 0,
                        y: 0,
                        tiletype: 0
                    }
    };
    
    // Neighbor offset table
    var neighborsoffsets = [[[1, 0], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1]], // Even row tiles
                            [[1, 0], [1, 1], [0, 1], [-1, 0], [0, -1], [1, -1]]];  // Odd row tiles
    
    // Number of different colors
    var bubblecolors = 7;
    
    // Game states
    var gamestates = { init: 0, ready: 1, shootbubble: 2, removecluster: 3, gameover: 4 };
    var gamestate = gamestates.init;
    
    // Score
    var score = 0;
    var highScore = 0;
    var difficultyLevel = 1;
    var shotsFired = 0;
    var highScoreKey = "bubbleShooterHighScore";

    function loadHighScore() {
        try { highScore = Math.max(0, Number(localStorage.getItem(highScoreKey)) || 0); }
        catch (e) { highScore = 0; }
    }

    function saveHighScore() {
        if (score > highScore) {
            highScore = score;
            try { localStorage.setItem(highScoreKey, String(highScore)); } catch (e) {}
        }
    }

    function addScore(points) {
        score += points;
        saveHighScore();
    }
    
    var turncounter = 0;
    var rowoffset = 0;
    
    // Animation variables
    var animationstate = 0;
    var animationtime = 0;
    
    // Clusters
    var showcluster = false;
    var cluster = [];
    var floatingclusters = [];
    
    // Images
    var images = [];
    var bubbleimage;
    
    // Image loading global variables
    var loadcount = 0;
    var loadtotal = 0;
    var preloaded = false;
    
    // Load images
    function loadImages(imagefiles) {
        // Initialize variables
        loadcount = 0;
        loadtotal = imagefiles.length;
        preloaded = false;
        
        // Load the images
        var loadedimages = [];
        for (var i=0; i<imagefiles.length; i++) {
            // Create the image object
            var image = new Image();
            
            // Add onload event handler
            image.onload = function () {
                loadcount++;
                if (loadcount == loadtotal) {
                    // Done loading
                    preloaded = true;
                }
            };
            
            // Set the source url of the image
            image.src = imagefiles[i];
            
            // Save to the image array
            loadedimages[i] = image;
        }
        
        // Return an array of images
        return loadedimages;
    }
    
    // Initialize the game
    function init() {
        // Load images
        images = loadImages(["bubble-sprites.png"]);
        bubbleimage = images[0];
    
        // Add mouse events
        loadHighScore();
        canvas.addEventListener("pointermove", onPointerMove, { passive: false });
        canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
        
        // Initialize the two-dimensional tile array
        for (var i=0; i<level.columns; i++) {
            level.tiles[i] = [];
            for (var j=0; j<level.rows; j++) {
                // Define a tile type and a shift parameter for animation
                level.tiles[i][j] = new Tile(i, j, 0, 0);
            }
        }
        
        level.width = level.columns * level.tilewidth + level.tilewidth/2;
        level.height = (level.rows-1) * level.rowheight + level.tileheight;
        
        // Init the player
        player.x = level.x + level.width/2 - level.tilewidth/2;
        player.y = level.y + level.height;
        player.angle = 90;
        player.tiletype = 0;
        
        player.nextbubble.x = player.x - 2 * level.tilewidth;
        player.nextbubble.y = player.y;
        
        // New game
        newGame();
        
        // Enter main loop
        main(0);
    }
    
    // Main loop
    function main(tframe) {
        // Request animation frames
        window.requestAnimationFrame(main);
    
        if (!initialized) {
            // Preloader
            
            // Clear the canvas
            context.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the frame
            drawFrame();
            
            // Draw a progress bar
            var loadpercentage = loadcount/loadtotal;
            context.strokeStyle = "#ff8080";
            context.lineWidth=3;
            context.strokeRect(18.5, 0.5 + canvas.height - 51, canvas.width-37, 32);
            context.fillStyle = "#ff8080";
            context.fillRect(18.5, 0.5 + canvas.height - 51, loadpercentage*(canvas.width-37), 32);
            
            // Draw the progress text
            var loadtext = "Loaded " + loadcount + "/" + loadtotal + " images";
            context.fillStyle = "#000000";
            context.font = "16px Verdana";
            context.fillText(loadtext, 18, 0.5 + canvas.height - 63);
            
            if (preloaded) {
                // Add a delay for demonstration purposes
                setTimeout(function(){initialized = true;}, 1000);
            }
        } else {
            // Update and render the game
            update(tframe);
            render();
        }
    }
    
    // Update the game state
    function update(tframe) {
        var dt = (tframe - lastframe) / 1000;
        lastframe = tframe;
        
        // Update the fps counter
        updateFps(dt);
        
        if (gamestate == gamestates.ready) {
            // Game is ready for player input
        } else if (gamestate == gamestates.shootbubble) {
            // Bubble is moving
            stateShootBubble(dt);
        } else if (gamestate == gamestates.removecluster) {
            // Remove cluster and drop tiles
            stateRemoveCluster(dt);
        }
    }
    
    function setGameState(newgamestate) {
        gamestate = newgamestate;
        
        animationstate = 0;
        animationtime = 0;
    }
    
    function stateShootBubble(dt) {
        // Sub-step movement so fast bubbles cannot pass through a bubble between frames.
        var remaining = Math.max(0, dt);
        var maxStep = Math.max(3, level.radius * 0.35);
        var totalDistance = player.bubble.speed * remaining;
        var steps = Math.max(1, Math.ceil(totalDistance / maxStep));
        var stepTime = remaining / steps;

        for (var step = 0; step < steps; step++) {
            player.bubble.x += stepTime * player.bubble.speed * Math.cos(degToRad(player.bubble.angle));
            player.bubble.y -= stepTime * player.bubble.speed * Math.sin(degToRad(player.bubble.angle));

            if (player.bubble.x <= level.x) {
                player.bubble.x = level.x;
                player.bubble.angle = 180 - player.bubble.angle;
            } else if (player.bubble.x + level.tilewidth >= level.x + level.width) {
                player.bubble.x = level.x + level.width - level.tilewidth;
                player.bubble.angle = 180 - player.bubble.angle;
            }

            if (player.bubble.y <= level.y) {
                player.bubble.y = level.y;
                snapBubble();
                return;
            }

            for (var i = 0; i < level.columns; i++) {
                for (var j = 0; j < level.rows; j++) {
                    var tile = level.tiles[i][j];
                    if (tile.type < 0 || tile.removed) continue;
                    var coord = getTileCoordinate(i, j);
                    if (circleIntersection(
                        player.bubble.x + level.tilewidth / 2,
                        player.bubble.y + level.tileheight / 2,
                        level.radius,
                        coord.tilex + level.tilewidth / 2,
                        coord.tiley + level.tileheight / 2,
                        level.radius
                    )) {
                        snapBubble();
                        return;
                    }
                }
            }
        }
    }
        function stateRemoveCluster(dt) {
        if (animationstate == 0) {
            resetRemoved();
            
            // Mark the tiles as removed
            for (var i=0; i<cluster.length; i++) {
                // Set the removed flag
                cluster[i].removed = true;
            }
            
            // Add cluster score
            addScore(cluster.length * 100);
            
            // Find floating clusters
            floatingclusters = findFloatingClusters();
            
            if (floatingclusters.length > 0) {
                // Setup drop animation
                for (var i=0; i<floatingclusters.length; i++) {
                    for (var j=0; j<floatingclusters[i].length; j++) {
                        var tile = floatingclusters[i][j];
                        tile.shift = 0;
                        tile.shift = 1;
                        tile.velocity = player.bubble.dropspeed;
                        
                        addScore(100);
                    }
                }
            }
            
            animationstate = 1;
        }
        
        if (animationstate == 1) {
            // Pop bubbles
            var tilesleft = false;
            for (var i=0; i<cluster.length; i++) {
                var tile = cluster[i];
                
                if (tile.type >= 0) {
                    tilesleft = true;
                    
                    // Alpha animation
                    tile.alpha -= dt * 15;
                    if (tile.alpha < 0) {
                        tile.alpha = 0;
                    }

                    if (tile.alpha == 0) {
                        tile.type = -1;
                        tile.alpha = 1;
                    }
                }                
            }
            
            // Drop bubbles
            for (var i=0; i<floatingclusters.length; i++) {
                for (var j=0; j<floatingclusters[i].length; j++) {
                    var tile = floatingclusters[i][j];
                    
                    if (tile.type >= 0) {
                        tilesleft = true;
                        
                        // Accelerate dropped tiles
                        tile.velocity += dt * 700;
                        tile.shift += dt * tile.velocity;
                            
                        // Alpha animation
                        tile.alpha -= dt * 8;
                        if (tile.alpha < 0) {
                            tile.alpha = 0;
                        }

                        // Check if the bubbles are past the bottom of the level
                        if (tile.alpha == 0 || (tile.y * level.rowheight + tile.shift > (level.rows - 1) * level.rowheight + level.tileheight)) {
                            tile.type = -1;
                            tile.shift = 0;
                            tile.alpha = 1;
                        }
                    }

                }
            }
            
            if (!tilesleft) {
                // Next bubble
                nextBubble();
                
                // Check for game over
                var tilefound = false
                for (var i=0; i<level.columns; i++) {
                    for (var j=0; j<level.rows; j++) {
                        if (level.tiles[i][j].type != -1) {
                            tilefound = true;
                            break;
                        }
                    }
                }
                
                if (tilefound) {
                    if (checkGameOver()) return;
                    setGameState(gamestates.ready);
                } else {
                    // No tiles left, game over
                    setGameState(gamestates.gameover);
                }
            }
        }
    }
    
    // Snap bubble to the grid
    function snapBubble() {
        var centerx = player.bubble.x + level.tilewidth / 2;
        var centery = player.bubble.y + level.tileheight / 2;
        var gridpos = findBestEmptyCell(centerx, centery);

        // No legal cell means the board is full; never overwrite an existing bubble.
        if (!gridpos) {
            player.bubble.visible = false;
            setGameState(gamestates.gameover);
            return;
        }

        player.bubble.visible = false;
        var placed = level.tiles[gridpos.x][gridpos.y];
        placed.type = player.bubble.tiletype;
        placed.alpha = 1;
        placed.shift = 0;
        placed.removed = false;

        shotsFired++;
        difficultyLevel = 1 + Math.floor(shotsFired / 12) + Math.floor(score / 1500);

        cluster = findCluster(gridpos.x, gridpos.y, true, true, false);
        if (cluster.length >= 3) {
            setGameState(gamestates.removecluster);
            return;
        }

        if (checkGameOver()) return;
        turncounter++;
        var shotsPerRow = Math.max(2, 5 - Math.floor((difficultyLevel - 1) / 2));
        if (turncounter >= shotsPerRow) {
            addBubbles();
            turncounter = 0;
            rowoffset = (rowoffset + 1) % 2;
            if (checkGameOver()) return;
        }

        nextBubble();
        setGameState(gamestates.ready);
    }

    // Select the nearest empty cell. Prefer cells touching the existing board so
    // bubbles cannot be stranded in disconnected or visually overlapping positions.
    function findBestEmptyCell(cx, cy) {
        var candidates = [];
        for (var y = 0; y < level.rows; y++) {
            for (var x = 0; x < level.columns; x++) {
                if (level.tiles[x][y].type !== -1) continue;
                var coord = getTileCoordinate(x, y);
                var tx = coord.tilex + level.tilewidth / 2;
                var ty = coord.tiley + level.tileheight / 2;
                var dx = tx - cx, dy = ty - cy;
                var distance = dx * dx + dy * dy;
                var attached = (y === 0);
                var neighbors = getNeighbors(level.tiles[x][y]);
                for (var n = 0; n < neighbors.length; n++) {
                    if (neighbors[n].type >= 0 && !neighbors[n].removed) {
                        attached = true;
                        break;
                    }
                }
                candidates.push({ x: x, y: y, distance: distance, attached: attached });
            }
        }
        if (!candidates.length) return null;
        candidates.sort(function(a, b) {
            if (a.attached !== b.attached) return a.attached ? -1 : 1;
            return a.distance - b.distance;
        });
        // Prefer a connected location unless the board is empty.
        var connected = candidates.filter(function(c) { return c.attached; });
        var chosen = connected.length ? connected[0] : candidates[0];
        return { x: chosen.x, y: chosen.y };
    }
        function checkGameOver() {
        // A bubble reaching the bottom playable row ends the round.
        for (var i = 0; i < level.columns; i++) {
            if (level.tiles[i][level.rows - 1].type >= 0) {
                saveHighScore();
                nextBubble();
                setGameState(gamestates.gameover);
                return true;
            }
        }
        return false;
    }
        function addBubbles() {
        // Move the rows downwards
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows-1; j++) {
                level.tiles[i][level.rows-1-j].type = level.tiles[i][level.rows-1-j-1].type;
            }
        }
        
        // Add a new row of bubbles at the top
        for (var i=0; i<level.columns; i++) {
            // Add random, existing, colors
            level.tiles[i][0].type = getExistingColor();
        }
    }
    
    // Find the remaining colors
    function findColors() {
        var foundcolors = [];
        var colortable = [];
        for (var i=0; i<bubblecolors; i++) {
            colortable.push(false);
        }
        
        // Check all tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (tile.type >= 0) {
                    if (!colortable[tile.type]) {
                        colortable[tile.type] = true;
                        foundcolors.push(tile.type);
                    }
                }
            }
        }
        
        return foundcolors;
    }
    
   
    function findCluster(tx, ty, matchtype, reset, skipremoved) {
        if (reset) resetProcessed();
        if (tx < 0 || tx >= level.columns || ty < 0 || ty >= level.rows) return [];
        var targettile = level.tiles[tx][ty];
        if (!targettile || targettile.type < 0 || targettile.removed) return [];

        var stack = [targettile];
        var foundcluster = [];
        targettile.processed = true;
        while (stack.length) {
            var currenttile = stack.pop();
            if (currenttile.type < 0 || (skipremoved && currenttile.removed)) continue;
            if (matchtype && currenttile.type !== targettile.type) continue;
            foundcluster.push(currenttile);

            var neighbors = getNeighbors(currenttile);
            for (var i = 0; i < neighbors.length; i++) {
                var neighbor = neighbors[i];
                if (!neighbor.processed && neighbor.type >= 0 && (!skipremoved || !neighbor.removed) &&
                    (!matchtype || neighbor.type === targettile.type)) {
                    neighbor.processed = true;
                    stack.push(neighbor);
                }
            }
        }
        return foundcluster;
    }

    // Find floating clusters
        // Find floating clusters
    function findFloatingClusters() {
        // Reset the processed flags
        resetProcessed();
        
        var foundclusters = [];
        
        // Check all tiles
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                var tile = level.tiles[i][j];
                if (!tile.processed) {
                    // Find all attached tiles
                    var foundcluster = findCluster(i, j, false, false, true);
                    
                    // There must be a tile in the cluster
                    if (foundcluster.length <= 0) {
                        continue;
                    }
                    
                    // Check if the cluster is floating
                    var floating = true;
                    for (var k=0; k<foundcluster.length; k++) {
                        if (foundcluster[k].y == 0) {
                            // Tile is attached to the roof
                            floating = false;
                            break;
                        }
                    }
                    
                    if (floating) {
                        // Found a floating cluster
                        foundclusters.push(foundcluster);
                    }
                }
            }
        }
        
        return foundclusters;
    }
    
    // Reset the processed flags
    function resetProcessed() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].processed = false;
            }
        }
    }
    
    // Reset the removed flags
    function resetRemoved() {
        for (var i=0; i<level.columns; i++) {
            for (var j=0; j<level.rows; j++) {
                level.tiles[i][j].removed = false;
            }
        }
    }
    
    // Get the neighbors of the specified tile
    function getNeighbors(tile) {
        var tilerow = (tile.y + rowoffset) % 2; // Even or odd row
        var neighbors = [];
        
       
        var n = neighborsoffsets[tilerow];
        
        // Get the neighbors
        for (var i=0; i<n.length; i++) {
            // Neighbor coordinate
            var nx = tile.x + n[i][0];
            var ny = tile.y + n[i][1];
            
            // Make sure the tile is valid
            if (nx >= 0 && nx < level.columns && ny >= 0 && ny < level.rows) {
                neighbors.push(level.tiles[nx][ny]);
            }
        }
        
        return neighbors;
    }
    
    function updateFps(dt) {
        if (fpstime > 0.25) {
            // Calculate fps
            fps = Math.round(framecount / fpstime);
            
            // Reset time and framecount
            fpstime = 0;
            framecount = 0;
        }
        
        // Increase time and framecount
        fpstime += dt;
        framecount++;
    }
    
    // Draw text that is centered
    function drawCenterText(text, x, y, width) {
        var textdim = context.measureText(text);
        context.fillText(text, x + (width-textdim.width)/2, y);
    }
    
    // Render the game
    function render() {
        // Draw the frame around the game
        drawFrame();
        
        var yoffset =  level.tileheight/2;
        
        // Draw level background
        context.fillStyle = "darkblue";
        context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 4 - yoffset);
        
        // Render tiles
        renderTiles();
        
        // Draw level bottom
        context.fillStyle = "#A6341E";
        context.fillRect(level.x - 4, level.y - 4 + level.height + 4 - yoffset, level.width + 8, 2*level.tileheight + 3);
        
        // Draw score
        context.fillStyle = "#ffffff";
        context.font = "18px Verdana";
        var scorex = level.x + level.width - 150;
        var scorey = level.y+level.height + level.tileheight - yoffset - 8;
        drawCenterText("Your Score:", scorex, scorey, 150);
        context.font = "24px Verdana";
        drawCenterText(score, scorex, scorey+30, 150);
        context.font = "13px Verdana";
        drawCenterText("Best: " + highScore, scorex, scorey+48, 150);

        // Render cluster
        if (showcluster) {
            renderCluster(cluster, 255, 128, 128);
            
            for (var i=0; i<floatingclusters.length; i++) {
                var col = Math.floor(100 + 100 * i / floatingclusters.length);
                renderCluster(floatingclusters[i], col, col, col);
            }
        }
        
        
        // Render player bubble
        renderPlayer();
        
        // Game Over overlay
        if (gamestate == gamestates.gameover) {
            context.fillStyle = "rgba(0, 0, 0, 0.8)";
            context.fillRect(level.x - 4, level.y - 4, level.width + 8, level.height + 2 * level.tileheight + 8 - yoffset);
            
            context.fillStyle = "#ffffff";
            context.font = "24px Verdana";
            drawCenterText("Game Over!", level.x, level.y + level.height / 2 + 10, level.width);
            drawCenterText("Click to start", level.x, level.y + level.height / 2 + 40, level.width);
        }
    }
    
    // Draw a frame around the game
    function drawFrame() {
        // Draw background
        context.fillStyle = "orange";
        context.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw header
        context.fillStyle = "#840A0A";
        context.fillRect(0, 0, canvas.width, 79);
        
        // Draw title
        context.fillStyle = "#ffffff";
        context.font = "24px Verdana";
        context.fillText("Bubble Shooter Game", 10, 37);
        
        // Display fps
        context.fillStyle = "whitesmoke";
        context.font = "12px cursive";
        context.fillText("Fps: " + fps + "   Level: " + difficultyLevel, 13, 57);
    }
    
    // Render tiles
    function renderTiles() {
        // Top to bottom
        for (var j=0; j<level.rows; j++) {
            for (var i=0; i<level.columns; i++) {
                // Get the tile
                var tile = level.tiles[i][j];
            
                
                var shift = tile.shift;
                
               
                var coord = getTileCoordinate(i, j);
                
              
                if (tile.type >= 0) {
                    // Support transparency
                    context.save();
                    context.globalAlpha = tile.alpha;
                    
                    // Draw the tile using the color
                    drawBubble(coord.tilex, coord.tiley + shift, tile.type);
                    
                    context.restore();
                }
            }
        }
    }
    
    // Render cluster
    function renderCluster(cluster, r, g, b) {
        for (var i=0; i<cluster.length; i++) {
            // Calculate the tile coordinates
            var coord = getTileCoordinate(cluster[i].x, cluster[i].y);
            
            // Draw the tile using the color
            context.fillStyle = "rgb(" + r + "," + g + "," + b + ")";
            context.fillRect(coord.tilex+level.tilewidth/4, coord.tiley+level.tileheight/4, level.tilewidth/2, level.tileheight/2);
        }
    }
    
    // Render the player bubble
    function renderPlayer() {
        var centerx = player.x + level.tilewidth/2;
        var centery = player.y + level.tileheight/2;
        
        // Draw player background circle
        context.fillStyle = "skyblue";
        context.beginPath();
        context.arc(centerx, centery, level.radius+12, 0, 2*Math.PI, false);
        context.fill();
        context.lineWidth = 2;
        context.strokeStyle = "yellow";
        context.stroke();

        // Draw the angle
        context.lineWidth = 2;
        context.strokeStyle = "purple";
        context.beginPath();
        context.moveTo(centerx, centery);
        context.lineTo(centerx + 1.5*level.tilewidth * Math.cos(degToRad(player.angle)), centery - 1.5*level.tileheight * Math.sin(degToRad(player.angle)));
        context.stroke();
        
        // Draw the next bubble
        drawBubble(player.nextbubble.x, player.nextbubble.y, player.nextbubble.tiletype);
        
        // Draw the bubble
        if (player.bubble.visible) {
            drawBubble(player.bubble.x, player.bubble.y, player.bubble.tiletype);
        }
        
    }
    
    // Get the tile coordinate
    function getTileCoordinate(column, row) {
        var tilex = level.x + column * level.tilewidth;
        
        // X offset for odd or even rows
        if ((row + rowoffset) % 2) {
            tilex += level.tilewidth/2;
        }
        
        var tiley = level.y + row * level.rowheight;
        return { tilex: tilex, tiley: tiley };
    }
    
    // Get the closest grid position
    function getGridPosition(x, y) {
        var gridy = Math.floor((y - level.y) / level.rowheight);
        
        // Check for offset
        var xoffset = 0;
        if ((gridy + rowoffset) % 2) {
            xoffset = level.tilewidth / 2;
        }
        var gridx = Math.floor(((x - xoffset) - level.x) / level.tilewidth);
        
        return { x: gridx, y: gridy };
    }

    
    // Draw the bubble
    function drawBubble(x, y, index) {
        if (index < 0 || index >= bubblecolors)
            return;
        
        // Draw the bubble sprite
        context.drawImage(bubbleimage, index * 40, 0, 40, 40, x, y, level.tilewidth,
         level.tileheight);
    }
    
    // Start a new game
    function newGame() {
        // Reset score
        score = 0;
        shotsFired = 0;
        difficultyLevel = 1;
        turncounter = 0;
        rowoffset = 0;
        
        // Set the gamestate to ready
        setGameState(gamestates.ready);
        
        // Create the level
        createLevel();

        
        nextBubble();
        nextBubble();
    }
    
    // Create a random level
    function createLevel() {
        // Create a level with random tiles
        for (var j=0; j<level.rows; j++) {
            var randomtile = randRange(0, bubblecolors-1);
            var count = 0;
            for (var i=0; i<level.columns; i++) {
                if (count >= 2) {
                    // Change the random tile
                    var newtile = randRange(0, bubblecolors-1);
                    
                  
                    if (newtile == randomtile) {
                        newtile = (newtile + 1) % bubblecolors;
                    }
                    randomtile = newtile;
                    count = 0;
                }
                count++;
                
                if (j < level.rows/2) {
                    level.tiles[i][j].type = randomtile;
                } else {
                    level.tiles[i][j].type = -1;
                }
            }
        }
    }
    
    // Create a random bubble for the player
    function nextBubble() {
        // Set the current bubble
        player.tiletype = player.nextbubble.tiletype;
        player.bubble.tiletype = player.nextbubble.tiletype;
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.visible = true;
        
        // Get a random type from the existing colors
        var nextcolor = getExistingColor();
        
        // Set the next bubble
        player.nextbubble.tiletype = nextcolor;
    }
    
    // Get a random existing color
    function getExistingColor() {
        existingcolors = findColors();
        
        var bubbletype = 0;
        if (existingcolors.length > 0) {
            bubbletype = existingcolors[randRange(0, existingcolors.length-1)];
        }
        
        return bubbletype;
    }
    
    // Get a random int between low and high, inclusive
    function randRange(low, high) {
        return Math.floor(low + Math.random()*(high-low+1));
    }
    
    // Shoot the bubble
    function shootBubble() {
        // Shoot the bubble in the direction of the mouse
        player.bubble.x = player.x;
        player.bubble.y = player.y;
        player.bubble.angle = player.angle;
        player.bubble.tiletype = player.tiletype;
        player.bubble.speed = Math.min(1250, 1000 + (difficultyLevel - 1) * 25);

        // Set the gamestate
        setGameState(gamestates.shootbubble);
    }
    
    // Check if two circles intersect
    function circleIntersection(x1, y1, r1, x2, y2, r2) {
        // Calculate the distance between the centers
        var dx = x1 - x2;
        var dy = y1 - y2;
        var len = Math.sqrt(dx * dx + dy * dy);
        
        if (len < r1 + r2) {
            // Circles intersect
            return true;
        }
        
        return false;
    }
    
    // Convert radians to degrees
    function radToDeg(angle) {
        return angle * (180 / Math.PI);
    }
    
    // Convert degrees to radians
    function degToRad(angle) {
        return angle * (Math.PI / 180);
    }

    // Pointer controls work with mouse, touch and stylus.
    function updateAim(e) {
        var pos = getMousePos(canvas, e);
        var mouseangle = radToDeg(Math.atan2(
            (player.y + level.tileheight / 2) - pos.y,
            pos.x - (player.x + level.tilewidth / 2)
        ));
        if (mouseangle < 0) mouseangle += 360;
        player.angle = Math.max(8, Math.min(172, mouseangle));
    }

    function onPointerMove(e) {
        if (e.cancelable) e.preventDefault();
        updateAim(e);
    }

    function onPointerDown(e) {
        if (e.cancelable) e.preventDefault();
        updateAim(e);
        if (gamestate === gamestates.ready) {
            shootBubble();
        } else if (gamestate === gamestates.gameover) {
            newGame();
        }
    }

    function getMousePos(canvas, e) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    // Call init to start
        // Call init to start 
    init();
};