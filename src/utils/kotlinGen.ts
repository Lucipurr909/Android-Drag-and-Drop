import { AndroidProject, AndroidComponent, AndroidScreen } from '../types';

/**
 * Transforms an hex color to standard Jetpack Compose Color constructor
 */
function getKotlinColor(hex: string | undefined, defaultVal: string): string {
  if (!hex) return defaultVal;
  const cleaned = hex.replace('#', '');
  if (cleaned.length === 6) {
    return `Color(0xFF${cleaned.toUpperCase()})`;
  } else if (cleaned.length === 8) {
    return `Color(0x${cleaned.toUpperCase()})`;
  }
  return defaultVal;
}

/**
 * Generates an individual Component in Jetpack Compose
 */
export function generateComponentCompose(
  comp: AndroidComponent,
  variables: any[],
  screens: AndroidScreen[]
): string {
  const props = comp.properties || {};
  const marginDp = props.margin !== undefined ? props.margin : 8;
  const heightModifier = props.height && props.height > 0 ? `.height(${props.height}.dp)` : '';
  const modifierStr = `Modifier.fillMaxWidth().padding(${marginDp}.dp)${heightModifier}`;

  // Helper to interp text with active state variable bindings
  const interpText = (str: string | undefined): string => {
    if (!str) return '""';
    let formatted = str;
    // Replace state template values, e.g. {counter} with $counter or ${counter}
    const matches = formatted.match(/\{([a-zA-Z0-9_]+)\}/g);
    if (matches) {
      matches.forEach(m => {
        const varName = m.substring(1, m.length - 1);
        formatted = formatted.replace(m, `$${varName}`);
      });
    }
    return `"${formatted}"`;
  };

  switch (comp.type) {
    case 'text': {
      const fontSizeSp = props.fontSize || 16;
      const textStyle = props.style === 'h1' ? 'MaterialTheme.typography.headlineLarge' :
                        props.style === 'h2' ? 'MaterialTheme.typography.headlineMedium' :
                        props.style === 'caption' ? 'MaterialTheme.typography.labelSmall' :
                        'MaterialTheme.typography.bodyLarge';
      
      const colorVal = props.textColor ? `, color = ${getKotlinColor(props.textColor, 'Color.Unspecified')}` : '';
      return `        Text(
            text = ${interpText(props.text)},
            style = ${textStyle},
            fontSize = ${fontSizeSp}.sp${colorVal},
            modifier = ${modifierStr}
        )`;
    }

    case 'button': {
      const isOutlined = props.style === 'outlined';
      const buttonType = isOutlined ? 'OutlinedButton' : 'Button';
      const btnColor = props.backgroundColor && !isOutlined 
        ? `, colors = ButtonDefaults.buttonColors(containerColor = ${getKotlinColor(props.backgroundColor, 'MaterialTheme.colorScheme.primary')})` 
        : '';

      // Compile action
      let onClickBody = '/* No custom action */';
      if (props.actionType === 'toast') {
        onClickBody = `Toast.makeText(context, "${props.actionValue || 'Click! '}", Toast.LENGTH_SHORT).show()`;
      } else if (props.actionType === 'navigate') {
        onClickBody = `navController.navigate("${props.actionValue || 'main_screen'}")`;
      } else if (props.actionType === 'state_increment') {
        const varName = props.actionValue || 'counter';
        onClickBody = `${varName} = ${varName} + 1`;
      } else if (props.actionType === 'state_decrement') {
        const varName = props.actionValue || 'counter';
        onClickBody = `${varName} = ${varName} - 1`;
      } else if (props.actionType === 'link' && props.actionValue) {
        onClickBody = `val intent = Intent(Intent.ACTION_VIEW, Uri.parse("${props.actionValue}"))\n            context.startActivity(intent)`;
      } else if (props.actionType === 'dialog') {
        onClickBody = 'showDialog = true';
      }

      return `        ${buttonType}(
            onClick = {
                ${onClickBody}
            },
            modifier = ${modifierStr}${btnColor}
        ) {
            Text(text = "${props.text || 'Button'}", fontSize = ${props.fontSize || 16}.sp)
        }`;
    }

    case 'textinput': {
      const boundVar = props.bindState || 'username';
      return `        OutlinedTextField(
            value = ${boundVar},
            onValueChange = { ${boundVar} = it },
            label = { Text("${props.placeholder || 'Enter value'} ") },
            modifier = ${modifierStr},
            singleLine = true
        )`;
    }

    case 'card': {
      const cardBg = props.backgroundColor ? `, colors = CardDefaults.cardColors(containerColor = ${getKotlinColor(props.backgroundColor, 'MaterialTheme.colorScheme.surfaceVariant')})` : '';
      const textVal = props.text || 'Card Title';
      return `        Card(
            modifier = ${modifierStr},
            elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)${cardBg}
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "${textVal}", style = MaterialTheme.typography.titleLarge)
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "${props.placeholder || 'Card subtitle details go here.'}", style = MaterialTheme.typography.bodyMedium)
            }
        }`;
    }

    case 'image': {
      const keyword = props.src || 'workspace';
      const cornerRadius = 8;
      return `        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(${props.height || 180}.dp)
                .padding(${marginDp}.dp)
                .clip(RoundedCornerShape(${cornerRadius}.dp))
                .background(Color.LightGray),
            contentAlignment = Alignment.Center
        ) {
            // Native systems can load images from resource drawables or URLs using libraries like Coil
            Text(
                text = "🖼️ [Image: ${keyword}]",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.DarkGray
            )
        }`;
    }

    case 'switch': {
      const boundVar = props.bindState || 'isToggled';
      const labelText = props.text || 'Toggle state';
      return `        Row(
            modifier = ${modifierStr},
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(text = "${labelText}")
            Switch(
                checked = ${boundVar},
                onCheckedChange = { ${boundVar} = it }
            )
        }`;
    }

    case 'slider': {
      const boundVar = props.bindState || 'progress';
      const labelText = props.text || 'Slider level';
      return `        Column(modifier = ${modifierStr}) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text(text = "${labelText}")
                Text(text = "\${${boundVar}.toInt()}%")
            }
            Slider(
                value = ${boundVar},
                onValueChange = { ${boundVar} = it },
                valueRange = 0f..100f
            )
        }`;
    }

    case 'listitem': {
      const title = props.text || "Item Title";
      const desc = props.placeholder || "Secondary description text";
      const badgeText = props.style || "";
      const isNav = props.actionType === 'navigate';
      const rowClickModifier = isNav 
        ? `.clickable { navController.navigate("${props.actionValue || 'main_screen'}") }` 
        : '';

      return `        Card(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = ${marginDp}.dp, vertical = 4.dp)${rowClickModifier},
            shape = RoundedCornerShape(8.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Row(
                modifier = Modifier.padding(12.dp).fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(20.dp))
                        .background(MaterialTheme.colorScheme.primaryContainer),
                    contentAlignment = Alignment.Center
                ) {
                    Text("💡", color = MaterialTheme.colorScheme.onPrimaryContainer)
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(text = "${title}", style = MaterialTheme.typography.titleMedium)
                    Text(text = "${desc}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                }
                ${badgeText ? `
                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(MaterialTheme.colorScheme.secondaryContainer)
                        .padding(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text("${badgeText}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSecondaryContainer)
                }` : ''}
            }
        }`;
    }

    case 'progressbar': {
      const isIndeterminate = !props.bindState;
      const progressColor = props.textColor ? `color = ${getKotlinColor(props.textColor, 'MaterialTheme.colorScheme.primary')}, ` : '';
      if (isIndeterminate) {
        return `        Box(
            modifier = ${modifierStr},
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(${progressColor}modifier = Modifier.size(36.dp))
        }`;
      } else {
        const boundVar = props.bindState || 'progress';
        return `        LinearProgressIndicator(
            progress = ${boundVar} / 100f,
            ${progressColor}modifier = ${modifierStr}
        )`;
      }
    }

    case 'divider': {
      return `        HorizontalDivider(
            modifier = Modifier.padding(vertical = ${marginDp}.dp),
            color = MaterialTheme.colorScheme.outlineVariant
        )`;
    }

    case 'spacer': {
      const heightVal = props.height || 16;
      return `        Spacer(modifier = Modifier.height(${heightVal}.dp))`;
    }

    case 'calendar': {
      const boundVar = props.bindState || 'selected_date';
      const labelText = props.text || 'Choose Appointment Date';
      return `        Card(
            modifier = ${modifierStr},
            elevation = CardDefaults.cardElevation(defaultElevation = 2.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "${labelText}", style = MaterialTheme.typography.titleMedium)
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer)
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text(text = "\${${boundVar}}", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onPrimaryContainer)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                // Simulated Calendar Month Grid layout representation in Jetpack Compose
                Text(
                    text = "📅 Simulated Month Grid (M3 Date Picker Blueprint)",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.secondary,
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp)
                )
            }
        }`;
    }

    case 'checkbox': {
      const boundVar = props.bindState || 'isChecked';
      const labelText = props.text || 'I accept terms & rules';
      return `        Row(
            modifier = ${modifierStr},
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Start
        ) {
            Checkbox(
                checked = ${boundVar},
                onCheckedChange = { ${boundVar} = it }
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = "${labelText}", style = MaterialTheme.typography.bodyMedium)
        }`;
    }

    case 'chart': {
      const labelText = props.text || 'Performance Analysis Metrics';
      return `        Card(
            modifier = ${modifierStr},
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Text(text = "${labelText}", style = MaterialTheme.typography.titleMedium)
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(100.dp)
                        .background(MaterialTheme.colorScheme.surface)
                        .padding(8.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("📊 [M3 Canvas Drawing - Spline Curve Analytics Plot]", style = MaterialTheme.typography.labelSmall)
                }
            }
        }`;
    }

    case 'timer': {
      const boundVar = props.bindState || 'timer_seconds';
      const labelText = props.text || 'Countdown Clock Duration';
      return `        Card(
            modifier = ${modifierStr},
            colors = CardDefaults.cardColors(containerColor = Color(0xFF1E293B))
        ) {
            Column(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "${labelText}", 
                    style = MaterialTheme.typography.labelMedium, 
                    color = Color.LightGray
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = "\${${boundVar} / 60}:\${String.format(\"%02d\", ${boundVar} % 60)}",
                    style = MaterialTheme.typography.headlineLarge,
                    color = Color.White
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(onClick = { /* Simulated count interval trigger state controller */ }) {
                    Text("START TIMER")
                }
            }
        }`;
    }

    case 'map': {
      const labelText = props.text || 'GPS Location Map';
      const address = props.placeholder || 'San Francisco, CA';
      const mapHeight = props.height || 160;
      return `        Card(
            modifier = ${modifierStr},
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(12.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "${labelText}", style = MaterialTheme.typography.titleSmall)
                    Text(text = "LIVE GPS", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                }
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(${mapHeight}.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFFE2E8F0)),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(text = "📍 ${address}", style = MaterialTheme.typography.bodyMedium, color = Color.DarkGray)
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(text = "[Simulated Google Map Canvas Overlay]", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    }
                }
            }
        }`;
    }

    case 'rating': {
      const boundVar = props.bindState || 'user_rating';
      const labelText = props.text || 'Rate your Experience';
      return `        Card(
            modifier = ${modifierStr},
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
        ) {
            Row(
                modifier = Modifier.padding(16.dp).fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(text = "${labelText}", style = MaterialTheme.typography.titleMedium)
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(text = "Score: \${${boundVar}} / 5 Stars", style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(text = "★★★★★", color = Color(0xFFFBBF24), style = MaterialTheme.typography.titleLarge)
                }
            }
        }`;
    }

    case 'chip': {
      const boundVar = props.bindState || 'active_chip';
      const itemsList = (props.text || "All,Hot,New").split(',').map(s => s.trim()).filter(Boolean);
      const composeItems = itemsList.map(item => `"${item}"`).join(', ');
      return `        LazyRow(
            modifier = ${modifierStr},
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 4.dp, vertical = 2.dp)
        ) {
            val filterItems = listOf(${composeItems})
            items(filterItems) { item ->
                val isSelected = ${boundVar} == item
                SuggestionChip(
                    onClick = { ${boundVar} = item },
                    label = { Text(text = item, style = MaterialTheme.typography.labelMedium) }
                )
            }
        }`;
    }

    case 'audio': {
      const boundVar = props.bindState || 'is_audio_playing';
      const labelText = props.text || 'Calm Audio Stream';
      const placeholder = props.placeholder || 'Subtext details...';
      return `        Card(
            modifier = ${modifierStr},
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
            shape = RoundedCornerShape(20.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(MaterialTheme.colorScheme.primary),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "🎵", color = Color.White)
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(text = "${labelText}", style = MaterialTheme.typography.titleMedium)
                        Text(text = "${placeholder}", style = MaterialTheme.typography.bodySmall, color = Color.Gray)
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                LinearProgressIndicator(
                    progress = 0.35f,
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = { /* Skip Back */ }) {
                        Text(text = "⏮")
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    IconButton(
                        onClick = { ${boundVar} = !${boundVar} }
                    ) {
                        Text(text = if (${boundVar}) "⏸" else "▶", style = MaterialTheme.typography.titleMedium)
                    }
                    Spacer(modifier = Modifier.width(16.dp))
                    IconButton(onClick = { /* Skip Forward */ }) {
                        Text(text = "⏭")
                    }
                }
            }
        }`;
    }

    case 'dropdown': {
      const boundVar = props.bindState || 'selected_option';
      const labelText = props.text || 'Service Choice';
      return `        Column(modifier = ${modifierStr}) {
            Text(
                text = "${labelText}", 
                style = MaterialTheme.typography.labelSmall, 
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.padding(bottom = 4.dp)
            )
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .border(1.dp, Color.LightGray, RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .padding(horizontal = 12.dp, vertical = 10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(text = "\${${boundVar}}", style = MaterialTheme.typography.bodyMedium)
                    Text(text = "▼", color = Color.Gray, style = MaterialTheme.typography.labelMedium)
                }
            }
        }`;
    }

    case 'datatable': {
      const tableName = props.bindState || 'items';
      const heading = props.text || 'Database Records';
      return `        Card(
            modifier = ${modifierStr},
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            border = BorderStroke(1.dp, Color(0xFFE2E8F0)),
            shape = RoundedCornerShape(16.dp)
        ) {
            Column(modifier = Modifier.padding(16.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "${heading}", 
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold
                    )
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(0xFFEEF2F6))
                            .padding(horizontal = 6.dp, vertical = 3.dp)
                    ) {
                        Text(
                            text = "ROOM DB: ${tableName.toUpperCase()}", 
                            style = MaterialTheme.typography.labelSmall,
                            color = Color(0xFF475569)
                        )
                    }
                }
                Spacer(modifier = Modifier.height(12.dp))
                
                // M3 Local DB Header
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0xFFF1F5F9))
                        .padding(8.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text("FIELD", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = Color.DarkGray)
                    Text("VALUE / METRIC", style = MaterialTheme.typography.labelSmall, fontWeight = FontWeight.SemiBold, color = Color.DarkGray)
                }
                
                // Simulated rows reading from SQL Database
                Column {
                    listOf("Active Workout Record", "Calorie Balance Intake", "Target Milestone").forEachIndexed { idx, rowText ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(text = "#\${idx + 1}", style = MaterialTheme.typography.bodyMedium, color = Color.Gray)
                            Text(text = rowText, style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
        }`;
    }

    default:
      return `        // Unknown component type ${comp.type}`;
  }
}

/**
 * Generates Jetpack Compose source file code for a single screen
 */
export function generateScreenKotlin(screen: AndroidScreen, project: AndroidProject): string {
  const compLines = screen.components
    .map(c => generateComponentCompose(c, project.variables, project.screens))
    .join('\n\n');

  // Find any textfields, slides, toggle, or dialog dependencies on state values
  const hasDialogButton = screen.components.some(c => c.properties?.actionType === 'dialog');

  return `package ${project.packageName}.ui.screens

import android.content.Intent
import android.net.Uri
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavController

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ${screen.name.replace(/\s+/g, '')}Screen(
    navController: NavController,
    stateManager: GlobalStateManager
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    
    // Dialog control state if any button launches a popup
    var showDialog by remember { mutableStateOf(false) }

    // Read bound reactive variables
${project.variables.map(v => {
  const typeKotlin = v.type === 'number' ? 'Float' : v.type === 'boolean' ? 'Boolean' : 'String';
  const valGetter = v.type === 'number' ? `stateManager.${v.name}.value.toFloat()` :
                    v.type === 'boolean' ? `stateManager.${v.name}.value.toBoolean()` :
                    `stateManager.${v.name}.value`;
  return `    var ${v.name} by remember { mutableStateOf(${v.type === 'number' ? `${valGetter}f` : valGetter}) }\n    // Propagate local screen state back to viewmodel
    LaunchedEffect(${v.name}) {
        stateManager.update("${v.name}", ${v.name}.toString())
    }`;
}).join('\n')}

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(text = "${screen.name}") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                    titleContentColor = MaterialTheme.colorScheme.onPrimaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .verticalScroll(scrollState)
                .background(MaterialTheme.colorScheme.background)
        ) {
            Spacer(modifier = Modifier.height(12.dp))
            
${compLines}

            Spacer(modifier = Modifier.height(30.dp))
        }
    }

    if (showDialog) {
        AlertDialog(
            onDismissRequest = { showDialog = false },
            title = { Text(text = "Information Notification") },
            text = { Text(text = "This alert popup was triggered by an action defined in the Android App Maker creator dashboard.") },
            confirmButton = {
                TextButton(onClick = { showDialog = false }) {
                    Text("OK")
                }
            }
        )
    }
}
`;
}

/**
 * Generates the Global State Manager file matching screen bindings
 */
export function generateStateManagerKotlin(project: AndroidProject): string {
  const stateInits = project.variables.map(v => {
    return `    val ${v.name} = mutableStateOf("${v.defaultValue}")`;
  }).join('\n');

  return `package ${project.packageName}.ui.screens

import androidx.compose.runtime.mutableStateOf
import androidx.lifecycle.ViewModel

class GlobalStateManager : ViewModel() {
    // Reactive global application states
${stateInits}

    fun update(name: String, value: String) {
        switch (name) {
${project.variables.map(v => `            "${v.name}" -> ${v.name}.value = value`).join('\n')}
        }
    }
}
`;
}

/**
 * Generates the Primary MainActivity containing Navigation Router
 */
export function generateMainActivityKotlin(project: AndroidProject): string {
  const screensCode = project.screens.map(s => {
    const screenNameNoSpace = s.name.replace(/\s+/g, '');
    return `                composable("${s.id}") {
                    ${screenNameNoSpace}Screen(navController = navController, stateManager = stateManager)
                }`;
  }).join('\n');

  return `package ${project.packageName}

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import ${project.packageName}.ui.screens.*
import ${project.packageName}.ui.theme.${project.appName.replace(/\s+/g, '')}Theme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);
        setContent {
            ${project.appName.replace(/\s+/g, '')}Theme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    AppNavigation()
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    const navController = rememberNavController()
    const stateManager: GlobalStateManager = viewModel()

    NavHost(
        navController = navController,
        startDestination = "${project.initialScreenId}"
    ) {
${screensCode}
    }
}
`;
}

/**
 * Generates standard Material 3 Colors and Theme configuration matching user colors
 */
export function generateThemeKotlin(project: AndroidProject): string {
  const themeName = project.appName.replace(/\s+/g, '');
  const colorHex = project.themeColor.replace('#', '');
  return `package ${project.packageName}.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val LightColorScheme = lightColorScheme(
    primary = Color(0xFF${colorHex.toUpperCase()}),
    secondary = Color(0xFF476288),
    tertiary = Color(0xFF755470),
    background = Color(0xFFFFFBFF),
    surface = Color(0xFFFFFBFF),
    primaryContainer = Color(0xFFE0E0FF),
    onPrimaryContainer = Color(0xFF000000)
)

private val DarkColorScheme = darkColorScheme(
    primary = Color(0xFF${colorHex.toUpperCase()}),
    secondary = Color(0xFFB5C7EF),
    tertiary = Color(0xFFE4BADF),
    background = Color(0xFF1B1B1F),
    surface = Color(0xFF1B1B1F),
    primaryContainer = Color(0xFF3B3B70),
    onPrimaryContainer = Color(0xFFE0E0FF)
)

@Composable
fun ${themeName}Theme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) {
        DarkColorScheme
    } else {
        LightColorScheme
    }

    MaterialTheme(
        colorScheme = colorScheme,
        typography = MaterialTheme.typography,
        content = content
    )
}
`;
}

import { DatabaseTable } from '../types';

export function generateRoomEntity(table: DatabaseTable, packageName: string): string {
  const entityName = table.name.charAt(0).toUpperCase() + table.name.slice(1).replace(/\s+/g, '') + "Entity";
  
  const fieldsCode = table.columns.map(col => {
    let ktType = 'String';
    if (col.type === 'INTEGER') ktType = 'Int';
    if (col.type === 'REAL') ktType = 'Double';
    
    if (col.isPrimaryKey) {
      return `    @PrimaryKey(autoGenerate = true)\n    val id: ${ktType} = 0`;
    }
    return `    val ${col.name}: ${ktType}`;
  }).join(',\n');

  return `package ${packageName}.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "${table.name.toLowerCase()}")
data class ${entityName}(
${fieldsCode}
)
`;
}

export function generateRoomDao(table: DatabaseTable, packageName: string): string {
  const className = table.name.charAt(0).toUpperCase() + table.name.slice(1).replace(/\s+/g, '');
  const entityName = className + "Entity";
  const daoName = className + "Dao";

  return `package ${packageName}.data

import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ${daoName} {
    @Query("SELECT * FROM ${table.name.toLowerCase()}")
    fun getAll(): Flow<List<${entityName}>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(item: ${entityName})

    @Delete
    suspend fun delete(item: ${entityName})

    @Query("DELETE FROM ${table.name.toLowerCase()}")
    suspend fun clearAll()
}
`;
}

export function generateRoomDatabaseKotlin(tables: DatabaseTable[], packageName: string): string {
  const entityImports = tables.map(t => {
    const className = t.name.charAt(0).toUpperCase() + t.name.slice(1).replace(/\s+/g, '');
    return `import ${packageName}.data.${className}Entity\nimport ${packageName}.data.${className}Dao`;
  }).join('\n');

  const entityClasses = tables.map(t => {
    return t.name.charAt(0).toUpperCase() + t.name.slice(1).replace(/\s+/g, '') + "Entity::class";
  }).join(', ');

  const daoAbstractMethods = tables.map(t => {
    const className = t.name.charAt(0).toUpperCase() + t.name.slice(1).replace(/\s+/g, '');
    return `    abstract fun ${t.name.toLowerCase()}Dao(): ${className}Dao`;
  }).join('\n');

  return `package ${packageName}.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
${entityImports}

@Database(entities = [${entityClasses}], version = 1, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
${daoAbstractMethods}

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "app_database"
                ).build()
                INSTANCE = instance
                instance
            }
        }
    }
}
`;
}
