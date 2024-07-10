<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Mapgen from '@/assets/mapgen';
import MapDisplay from '@/assets/mapdisplay';

const display: any = ref(null);
const inputContainer = ref(null);
var mapgen: Mapgen = new Mapgen();
var mapdisplay: MapDisplay;
var size: any = ref(null);
var solidDensity: any = ref(null);

// Whether to display the tiles or the heightmap (or nothing)
var viewMode = '1';

onMounted(() => {
    mapdisplay = new MapDisplay(display.value);
    render();
    window.addEventListener('resize', render); // Redraw on resize
    fadeIn(0);
});

onUnmounted(() => {
    window.removeEventListener('resize', render);
});

function render(): void {
    size.value = mapgen.size;
    solidDensity.value = mapgen.solidDensity;
    mapgen.mapgen();
    mapdisplay.render(
        mapgen.wall_array,
        mapgen.crystal_array,
        mapgen.ore_array,
        mapgen.height_array,
        parseInt(viewMode)
    );
}

function shuffle(e: Event): void {
    e.preventDefault();
    mapgen.seed = String(Math.floor(Math.random() * 1000000000000000));

    mapgen.shuffle_parameters();
    render();
}

// Fade in animation for the inputs
function fadeIn(index: number) {
    // Apply the css to transition to one item
    // @ts-expect-error
    inputContainer!.value.childNodes[index].style['margin-top'] = '1.5rem';
    // @ts-expect-error
    inputContainer.value.childNodes[index].style['opacity'] = '1';

    // Animate the next item
    index++;
    // @ts-expect-error
    if (index < inputContainer.value.childNodes.length) {
        setTimeout(fadeIn, 30, index);
    }
}

function submit(e: Event): void {
    e.preventDefault();
}

// Download the level as a text file
function download() {
    const filename: string = 'GeneratedLevel.dat';
    const content: string = mapgen.save();

    const blob = new Blob([content], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
</script>

<template>
    <div class="container">
        <form class="input-container" ref="inputContainer" @submit="submit">
            <div class="animation-item">
                <span class="input-label">View mode</span>
                <div class="flex-input-container">
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="mapView"
                        value="1"
                        name="viewMode"
                        v-model.number="viewMode"
                        @change="render"
                    />
                    <label for="mapView" class="radio-label">Map</label>
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="heightView"
                        value="2"
                        name="viewMode"
                        v-model.number="viewMode"
                        @change="render"
                    />
                    <label for="heightView" class="radio-label">Height</label>
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="noneView"
                        value="0"
                        name="viewMode"
                        v-model.number="viewMode"
                        @change="render"
                    />
                    <label for="noneView" class="radio-label">None</label>
                    <div class="flex-spacer" />
                </div>
                <hr />
            </div>

            <div class="animation-item">
                <div class="flex-input-container">
                    <button @click="shuffle" type="button">Shuffle Inputs</button>
                    <button @click="submit" type="button" class="submit-intercept">
                        <!-- This invisible button is a hack that intercepts the submit action
                          before another button can.  It also makes all the sliders update when
                          you click Shuffle.   -->
                        {{ solidDensity }}
                    </button>
                </div>
            </div>

            <div class="animation-item">
                <span class="input-label">Seed</span>
                <input type="number" @input="render" v-model.number="mapgen.seed" />
            </div>

            <div class="animation-item">
                <span class="input-label">Map Size: {{ size }} &#215; {{ size }}</span>
                <input
                    type="range"
                    min="8"
                    max="96"
                    step="8"
                    list="mapSizes"
                    @input="render"
                    v-model.number="mapgen.size"
                />
                <datalist id="mapSizes">
                    <option v-for="n in 96 / 8" v-bind:value="n * 8" :key="n"></option>
                </datalist>
            </div>

            <div class="animation-item">
                <span class="input-label">Solid Rock</span>
                <input
                    type="range"
                    v-model="mapgen.solidDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Other Rock</span>
                <input
                    type="range"
                    v-model="mapgen.wallDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Energy Crystals</span>
                <input
                    type="range"
                    v-model="mapgen.crystalDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Ore</span>
                <input
                    type="range"
                    v-model="mapgen.oreDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Energy Crystal Seams</span>
                <input
                    type="range"
                    v-model="mapgen.crystalSeamDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Ore Seams</span>
                <input
                    type="range"
                    v-model="mapgen.oreSeamDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Recharge Seams</span>
                <input
                    type="range"
                    v-model="mapgen.rechargeSeamDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Water or Lava</span>
                <div class="flex-input-container">
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="waterFlood"
                        name="floodType"
                        value="6"
                        v-model="mapgen.floodType"
                        @change="render"
                    />
                    <label for="waterFlood" class="radio-label">Water</label>

                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="lavaFlood"
                        name="floodType"
                        value="7"
                        v-model="mapgen.floodType"
                        @change="render"
                    />
                    <label for="lavaFlood" class="radio-label">Lava</label>

                    <div class="flex-spacer" />
                </div>
                <hr />
            </div>

            <div class="animation-item">
                <span class="input-label">Water/Lava Flood Level</span>
                <input
                    type="range"
                    v-model="mapgen.floodLevel"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Erosion Sources</span>
                <input
                    type="range"
                    v-model="mapgen.flowDensity"
                    @input="render"
                    min="0"
                    max="0.1"
                    step="0.001"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Landslide Sources</span>
                <input
                    type="range"
                    v-model="mapgen.landslideDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Slimy Slug Holes</span>
                <input
                    type="range"
                    v-model="mapgen.slugDensity"
                    @input="render"
                    min="0"
                    max="1"
                    step="0.01"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Height Algorithm</span>
                <div class="flex-input-container">
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="squares"
                        value="0"
                        name="heightAlgo"
                        v-model.number="mapgen.heightAlgo"
                        @change="render"
                    />
                    <label for="squares" class="radio-label">Squares</label>
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="waves"
                        value="1"
                        name="heightAlgo"
                        v-model.number="mapgen.heightAlgo"
                        @change="render"
                    />
                    <label for="waves" class="radio-label">Waves</label>
                    <div class="flex-spacer" />
                </div>
                <hr />
            </div>

            <div class="animation-item">
                <span class="input-label">Height Range</span>
                <input
                    type="range"
                    v-model="mapgen.heightRange"
                    @input="render"
                    min="1"
                    max="50"
                    step="1"
                />
            </div>

            <div class="animation-item">
                <span class="input-label">Biome</span>
                <div class="flex-input-container">
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="rock"
                        value="rock"
                        name="biome"
                        v-model="mapgen.biome"
                        @change="render"
                    />
                    <label for="rock" class="radio-label">Rock</label>
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="ice"
                        value="ice"
                        name="biome"
                        v-model="mapgen.biome"
                        @change="render"
                    />
                    <label for="ice" class="radio-label">Ice</label>
                    <div class="flex-spacer" />
                    <input
                        type="radio"
                        id="lava"
                        value="lava"
                        name="biome"
                        v-model="mapgen.biome"
                        @change="render"
                    />
                    <label for="lava" class="radio-label">Lava</label>
                    <div class="flex-spacer" />
                </div>
                <hr />
            </div>

            <div class="animation-item">
                <div class="flex-input-container">
                    <button @click="download" type="button">Save Map</button>
                </div>
            </div>
        </form>
        <div id="canvas-container-a">
            <div class="flex-spacer" />
            <canvas ref="display"></canvas>
            <div class="flex-spacer" />
        </div>
    </div>
</template>

<style scoped>
.container {
    display: flex;
    flex-direction: column-reverse;
    align-items: center;
}
.input-container {
    max-width: 30rem;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    padding: 0rem 2rem 0rem 2rem;
    width: 100%;
    margin-bottom: 1.5rem;
}

.animation-item {
    transition:
        margin-top 0.8s,
        opacity 0.5s;
    opacity: 0;
    /* margin-top: 1.5rem; */
    margin-top: 6rem;
}

input,
button {
    display: block;
    width: 100%;
}

.submit-intercept {
    display: none;
}

.flex-input-container input {
    width: auto;
}

.flex-input-container {
    display: flex;
    flex-direction: row;
}

.radio-label {
    margin-left: 0.4rem;
    margin-right: 0.4rem;
}

.flex-spacer {
    flex-grow: 1;
}

hr {
    margin-top: 0.2rem;
}

canvas {
    width: 100%;
    height: auto;
    flex-grow: 2;
    aspect-ratio: 1 / 1;
}

@media (min-width: 768px) {
    html,
    body {
        height: 100%;
    }
    .container {
        flex-direction: row-reverse;
        max-height: 100vh;
        max-width: 100vw;
        justify-content: center;
    }

    .input-container {
        overflow-y: scroll;
        max-height: 100vh;
        width: 20rem;
        min-width: 20rem;
    }

    #canvas-container-a {
        width: 100%;
        height: 100vh;
        max-width: 100vh;
        display: flex;
        flex-direction: column;
    }

    canvas {
        max-height: 100vh;
        height: auto;
        width: 100%;
        margin-top: auto;
        aspect-ratio: 1 / 1;
        flex-grow: 0;
    }
}
</style>
