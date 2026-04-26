<?php
/**
 * Plugin Name: SEO Rank Writer Connector
 * Plugin URI: https://seorankwriter.com
 * Description: AI-powered SEO content generation, schema, and WordPress publishing tool.
 * Version: 1.0.0
 * Author: SEO Rank Writer
 * License: GPL-2.0-or-later
 * Text Domain: seo-social-factory
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'SSF_VERSION', '1.0.0' );
define( 'SSF_OPTION_API_KEY', 'ssf_api_key' );
define( 'SSF_OPTION_LAST_CONNECTED', 'ssf_last_connected' );
define( 'SSF_OPTION_LAST_DRAFT', 'ssf_last_draft' );
define( 'SSF_OPTION_LAST_ERROR', 'ssf_last_error' );

/* ================================================================
   1. ACTIVATION — generate API key
   ================================================================ */

function ssf_activate() {
	if ( ! get_option( SSF_OPTION_API_KEY ) ) {
		update_option( SSF_OPTION_API_KEY, wp_generate_password( 40, false ) );
	}
}
register_activation_hook( __FILE__, 'ssf_activate' );

/* ================================================================
   2. REGISTER CUSTOM META FIELDS
   ================================================================ */

function ssf_register_meta_fields() {
	$post_types = array( 'post', 'page' );
	$fields     = array(
		'_ssf_meta_title',
		'_ssf_meta_description',
		'_ssf_focus_keyword',
		'_ssf_schema_json',
		'_ssf_og_title',
		'_ssf_og_description',
		'_ssf_og_image',
		'_ssf_seo_score',
		'_ssf_seo_breakdown',
	);

	foreach ( $post_types as $post_type ) {
		foreach ( $fields as $key ) {
			register_post_meta(
				$post_type,
				$key,
				array(
					'show_in_rest'  => true,
					'single'        => true,
					'type'          => 'string',
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}
}
add_action( 'init', 'ssf_register_meta_fields' );

/* ================================================================
   3. ADMIN MENU PAGE
   ================================================================ */

function ssf_admin_menu() {
	add_menu_page(
		'SEO Rank Writer',
		'SEO Rank Writer',
		'manage_options',
		'seo-social-factory',
		'ssf_admin_page',
		'dashicons-share-alt',
		80
	);
}
add_action( 'admin_menu', 'ssf_admin_menu' );

function ssf_admin_page() {
	// Handle regenerate key
	if (
		isset( $_POST['ssf_regenerate_key'] ) &&
		check_admin_referer( 'ssf_regenerate_key_action', 'ssf_nonce' )
	) {
		update_option( SSF_OPTION_API_KEY, wp_generate_password( 40, false ) );
		echo '<div class="notice notice-success is-dismissible"><p>API key regenerated successfully.</p></div>';
	}

	$api_key        = get_option( SSF_OPTION_API_KEY, '' );
	$endpoint_url   = rest_url( 'seo-social-factory/v1/create-draft' );
	$last_connected = get_option( SSF_OPTION_LAST_CONNECTED, '' );
	$last_draft_raw = get_option( SSF_OPTION_LAST_DRAFT, '' );
	$last_error     = get_option( SSF_OPTION_LAST_ERROR, '' );
	$last_draft     = $last_draft_raw ? json_decode( $last_draft_raw, true ) : null;
	$is_connected   = ! empty( $last_connected );
	$masked_key     = $api_key ? substr( $api_key, 0, 6 ) . str_repeat( '*', 28 ) . substr( $api_key, -6 ) : '';

	?>
	<style>
		.ssf-wrap { max-width: 780px; margin: 20px auto 40px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
		.ssf-header { background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); border-radius: 12px; padding: 28px 32px; margin-bottom: 24px; color: #fff; }
		.ssf-header h1 { margin: 0 0 4px; font-size: 22px; font-weight: 700; letter-spacing: -0.3px; }
		.ssf-header p { margin: 0; font-size: 14px; opacity: 0.85; }
		.ssf-header .ssf-version { display: inline-block; background: rgba(255,255,255,0.2); padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 600; margin-left: 10px; vertical-align: middle; }
		.ssf-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px 28px; margin-bottom: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
		.ssf-card h2 { font-size: 16px; font-weight: 700; color: #1a1a2e; margin: 0 0 16px; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; }
		.ssf-status-bar { display: flex; align-items: center; gap: 10px; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; font-size: 14px; font-weight: 600; }
		.ssf-status-bar.connected { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
		.ssf-status-bar.disconnected { background: #fefce8; border: 1px solid #fde68a; color: #854d0e; }
		.ssf-status-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
		.ssf-status-dot.on { background: #22c55e; }
		.ssf-status-dot.off { background: #eab308; }
		.ssf-row { display: flex; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid #f8fafc; }
		.ssf-row:last-child { border-bottom: none; }
		.ssf-row-label { width: 140px; font-size: 13px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.4px; flex-shrink: 0; padding-top: 2px; }
		.ssf-row-value { flex: 1; font-size: 14px; color: #1e293b; word-break: break-all; }
		.ssf-code { display: block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-family: "SF Mono", "Consolas", monospace; font-size: 13px; color: #334155; word-break: break-all; line-height: 1.5; }
		.ssf-key-row { display: flex; align-items: center; gap: 8px; }
		.ssf-key-row .ssf-code { flex: 1; }
		.ssf-btn { display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; font-size: 13px; font-weight: 600; border-radius: 6px; border: 1px solid #d1d5db; background: #fff; color: #374151; cursor: pointer; transition: all 0.15s; text-decoration: none; }
		.ssf-btn:hover { background: #f9fafb; border-color: #9ca3af; }
		.ssf-btn-primary { background: #2563eb; border-color: #2563eb; color: #fff; }
		.ssf-btn-primary:hover { background: #1d4ed8; border-color: #1d4ed8; color: #fff; }
		.ssf-btn-danger { color: #dc2626; border-color: #fecaca; }
		.ssf-btn-danger:hover { background: #fef2f2; }
		.ssf-btn-copy { padding: 8px 12px; }
		.ssf-steps { list-style: none; padding: 0; margin: 0; counter-reset: ssf-step; }
		.ssf-steps li { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; border-bottom: 1px solid #f8fafc; font-size: 14px; color: #475569; line-height: 1.6; counter-increment: ssf-step; }
		.ssf-steps li:last-child { border-bottom: none; }
		.ssf-steps li::before { content: counter(ssf-step); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; background: #2563eb; color: #fff; border-radius: 50%; font-size: 13px; font-weight: 700; flex-shrink: 0; }
		.ssf-activity-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; font-size: 13px; }
		.ssf-activity-label { color: #64748b; font-weight: 600; width: 130px; flex-shrink: 0; }
		.ssf-activity-value { color: #1e293b; }
		.ssf-activity-value.error { color: #dc2626; }
		.ssf-activity-value a { color: #2563eb; text-decoration: none; }
		.ssf-activity-value a:hover { text-decoration: underline; }
		.ssf-none { color: #94a3b8; font-style: italic; }
		.ssf-actions { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
	</style>

	<div class="ssf-wrap">

		<!-- Header -->
		<div class="ssf-header">
			<h1>SEO Rank Writer Connector <span class="ssf-version">v<?php echo esc_html( SSF_VERSION ); ?></span></h1>
			<p>Receive SEO content from the app and publish to WordPress automatically.</p>
		</div>

		<!-- Status Card -->
		<div class="ssf-card">
			<h2>Connection Status</h2>
			<?php if ( $is_connected ) : ?>
				<div class="ssf-status-bar connected">
					<span class="ssf-status-dot on"></span>
					Connected — Last activity: <?php echo esc_html( $last_connected ); ?>
				</div>
			<?php else : ?>
				<div class="ssf-status-bar disconnected">
					<span class="ssf-status-dot off"></span>
					Waiting for connection — Set up the app using the steps below
				</div>
			<?php endif; ?>
			<div class="ssf-row">
				<span class="ssf-row-label">Site URL</span>
				<span class="ssf-row-value"><code class="ssf-code"><?php echo esc_html( home_url() ); ?></code></span>
			</div>
			<div class="ssf-row">
				<span class="ssf-row-label">REST Endpoint</span>
				<span class="ssf-row-value"><code class="ssf-code"><?php echo esc_html( $endpoint_url ); ?></code></span>
			</div>
		</div>

		<!-- API Key Card -->
		<div class="ssf-card">
			<h2>API Key</h2>
			<p style="font-size:13px;color:#64748b;margin:0 0 12px;">Use this key in the SEO Rank Writer app to authenticate requests.</p>

			<div class="ssf-key-row">
				<code class="ssf-code" id="ssf-api-key-display"><?php echo esc_html( $masked_key ); ?></code>
				<button type="button" class="ssf-btn ssf-btn-copy" onclick="ssfCopyKey()" title="Copy API Key">
					<span class="dashicons dashicons-clipboard" style="font-size:16px;width:16px;height:16px;"></span>
				</button>
			</div>
			<input type="hidden" id="ssf-api-key-full" value="<?php echo esc_attr( $api_key ); ?>" />

			<div class="ssf-actions">
				<button type="button" class="ssf-btn" onclick="ssfToggleKey()" id="ssf-toggle-btn">Show Full Key</button>
				<form method="post" style="display:inline;">
					<?php wp_nonce_field( 'ssf_regenerate_key_action', 'ssf_nonce' ); ?>
					<button type="submit" name="ssf_regenerate_key" class="ssf-btn ssf-btn-danger"
						onclick="return confirm('Are you sure? The current key will stop working immediately.');">
						<span class="dashicons dashicons-update" style="font-size:14px;width:14px;height:14px;"></span>
						Regenerate Key
					</button>
				</form>
			</div>
		</div>

		<!-- Setup Instructions -->
		<div class="ssf-card">
			<h2>Setup Instructions</h2>
			<ol class="ssf-steps">
				<li>Copy your <strong>API Key</strong> from the card above.</li>
				<li>Open the <strong>SEO Rank Writer</strong> app and go to the <strong>WordPress</strong> tab.</li>
				<li>Select <strong>SSF Plugin</strong> mode, enter your site URL <code><?php echo esc_html( home_url() ); ?></code>, and paste the API key.</li>
				<li>Click <strong>Test Connection</strong> to verify everything works.</li>
				<li>Generate your SEO content and click <strong>Send to WordPress (Draft)</strong>.</li>
			</ol>
		</div>

		<!-- Activity Log -->
		<div class="ssf-card">
			<h2>Activity Log</h2>
			<div class="ssf-activity-row">
				<span class="ssf-activity-label">Last Connected</span>
				<span class="ssf-activity-value">
					<?php echo $last_connected ? esc_html( $last_connected ) : '<span class="ssf-none">No connections yet</span>'; ?>
				</span>
			</div>
			<div class="ssf-activity-row">
				<span class="ssf-activity-label">Last Draft Created</span>
				<span class="ssf-activity-value">
					<?php if ( $last_draft ) : ?>
						<a href="<?php echo esc_url( admin_url( "post.php?post={$last_draft['id']}&action=edit" ) ); ?>">
							<?php echo esc_html( $last_draft['title'] ?: "#{$last_draft['id']}" ); ?>
						</a>
						(<?php echo esc_html( $last_draft['type'] ); ?>) — <?php echo esc_html( $last_draft['time'] ); ?>
					<?php else : ?>
						<span class="ssf-none">No drafts created yet</span>
					<?php endif; ?>
				</span>
			</div>
			<div class="ssf-activity-row">
				<span class="ssf-activity-label">Last Error</span>
				<span class="ssf-activity-value <?php echo $last_error ? 'error' : ''; ?>">
					<?php echo $last_error ? esc_html( $last_error ) : '<span class="ssf-none">No errors</span>'; ?>
				</span>
			</div>
		</div>

	</div>

	<script>
	function ssfCopyKey() {
		var key = document.getElementById('ssf-api-key-full').value;
		if (navigator.clipboard) {
			navigator.clipboard.writeText(key).then(function() {
				var btn = document.querySelector('.ssf-btn-copy');
				var icon = btn.querySelector('.dashicons');
				icon.className = 'dashicons dashicons-yes';
				setTimeout(function() { icon.className = 'dashicons dashicons-clipboard'; }, 2000);
			});
		} else {
			var tmp = document.createElement('textarea');
			tmp.value = key;
			document.body.appendChild(tmp);
			tmp.select();
			document.execCommand('copy');
			document.body.removeChild(tmp);
		}
	}

	var ssfKeyVisible = false;
	function ssfToggleKey() {
		var display = document.getElementById('ssf-api-key-display');
		var btn = document.getElementById('ssf-toggle-btn');
		var full = document.getElementById('ssf-api-key-full').value;
		ssfKeyVisible = !ssfKeyVisible;
		if (ssfKeyVisible) {
			display.textContent = full;
			btn.textContent = 'Hide Key';
		} else {
			display.textContent = <?php echo wp_json_encode( $masked_key ); ?>;
			btn.textContent = 'Show Full Key';
		}
	}
	</script>
	<?php
}

/* ================================================================
   4. REST API ENDPOINT
   ================================================================ */

function ssf_register_rest_routes() {
	register_rest_route(
		'seo-social-factory/v1',
		'/create-draft',
		array(
			'methods'             => 'POST',
			'callback'            => 'ssf_handle_create_draft',
			'permission_callback' => 'ssf_verify_api_key',
		)
	);

	register_rest_route(
		'seo-social-factory/v1',
		'/test',
		array(
			'methods'             => 'GET',
			'callback'            => 'ssf_handle_test',
			'permission_callback' => 'ssf_verify_api_key',
		)
	);
}
add_action( 'rest_api_init', 'ssf_register_rest_routes' );

/**
 * Verify the X-SSF-API-Key header.
 */
function ssf_verify_api_key( $request ) {
	$provided = $request->get_header( 'X-SSF-API-Key' );
	$stored   = get_option( SSF_OPTION_API_KEY, '' );

	if ( empty( $stored ) || empty( $provided ) ) {
		return new WP_Error( 'ssf_unauthorized', 'Missing API key.', array( 'status' => 401 ) );
	}

	if ( ! hash_equals( $stored, $provided ) ) {
		return new WP_Error( 'ssf_unauthorized', 'Invalid API key.', array( 'status' => 401 ) );
	}

	return true;
}

/**
 * Test endpoint — confirms the connection works.
 */
function ssf_handle_test( $request ) {
	update_option( SSF_OPTION_LAST_CONNECTED, current_time( 'mysql' ) );
	delete_option( SSF_OPTION_LAST_ERROR );

	return rest_ensure_response(
		array(
			'ok'      => true,
			'site'    => home_url(),
			'name'    => get_bloginfo( 'name' ),
			'version' => SSF_VERSION,
		)
	);
}

/**
 * Create a draft post/page with SEO meta fields.
 */
function ssf_handle_create_draft( $request ) {
	$params = $request->get_json_params();

	$title       = sanitize_text_field( $params['title'] ?? '' );
	$slug        = sanitize_title( $params['slug'] ?? '' );
	$content     = wp_kses_post( $params['content'] ?? '' );
	$status      = 'draft';
	$post_type   = ( $params['postType'] ?? 'page' ) === 'post' ? 'post' : 'page';
	$excerpt     = sanitize_text_field( $params['excerpt'] ?? '' );

	if ( empty( $content ) ) {
		return new WP_Error( 'ssf_no_content', 'No content provided.', array( 'status' => 400 ) );
	}

	// Create the post
	$post_args = array(
		'post_title'   => $title,
		'post_content' => $content,
		'post_excerpt' => $excerpt,
		'post_status'  => $status,
		'post_type'    => $post_type,
	);

	if ( ! empty( $slug ) ) {
		$post_args['post_name'] = $slug;
	}

	$post_id = wp_insert_post( $post_args, true );

	if ( is_wp_error( $post_id ) ) {
		update_option( SSF_OPTION_LAST_ERROR, $post_id->get_error_message() . ' (' . current_time( 'mysql' ) . ')' );
		return new WP_Error(
			'ssf_insert_failed',
			$post_id->get_error_message(),
			array( 'status' => 500 )
		);
	}

	// Save SEO meta fields
	$meta_fields = array(
		'_ssf_meta_title'       => sanitize_text_field( $params['metaTitle'] ?? '' ),
		'_ssf_meta_description' => sanitize_text_field( $params['metaDescription'] ?? '' ),
		'_ssf_focus_keyword'    => sanitize_text_field( $params['focusKeyword'] ?? '' ),
		'_ssf_schema_json'      => $params['schemaJson'] ?? '',
		'_ssf_og_title'         => sanitize_text_field( $params['ogTitle'] ?? '' ),
		'_ssf_og_description'   => sanitize_text_field( $params['ogDescription'] ?? '' ),
		'_ssf_og_image'         => esc_url_raw( $params['ogImage'] ?? '' ),
		'_ssf_seo_breakdown'    => sanitize_text_field( $params['seoBreakdown'] ?? '' ),
	);

	foreach ( $meta_fields as $key => $value ) {
		if ( ! empty( $value ) ) {
			update_post_meta( $post_id, $key, $value );
		}
	}

	// Save SEO score as integer
	if ( isset( $params['seoScore'] ) && is_numeric( $params['seoScore'] ) ) {
		update_post_meta( $post_id, '_ssf_seo_score', intval( $params['seoScore'] ) );
	}

	// Log activity
	update_option( SSF_OPTION_LAST_CONNECTED, current_time( 'mysql' ) );
	update_option( SSF_OPTION_LAST_DRAFT, wp_json_encode( array(
		'id'    => $post_id,
		'title' => $title,
		'type'  => $post_type,
		'time'  => current_time( 'mysql' ),
	) ) );
	delete_option( SSF_OPTION_LAST_ERROR );

	// Build response
	$edit_link = admin_url( "post.php?post={$post_id}&action=edit" );

	return rest_ensure_response(
		array(
			'ok'       => true,
			'id'       => $post_id,
			'link'     => get_permalink( $post_id ),
			'editLink' => $edit_link,
			'type'     => $post_type,
			'status'   => $status,
		)
	);
}

/* ================================================================
   5. POST/PAGE META BOX — Edit SEO fields inside WordPress
   ================================================================ */

function ssf_add_meta_box() {
	$screens = array( 'post', 'page' );
	foreach ( $screens as $screen ) {
		add_meta_box(
			'ssf_seo_settings',
			'SEO Rank Writer',
			'ssf_render_meta_box',
			$screen,
			'normal',
			'high'
		);
	}
}
add_action( 'add_meta_boxes', 'ssf_add_meta_box' );

// Push our meta box above others (including RankMath)
function ssf_meta_box_order( $order ) {
	return array(
		'normal' => 'ssf_seo_settings,' . ( $order['normal'] ?? '' ),
	) + $order;
}
add_filter( 'get_user_option_meta-box-order_post', 'ssf_meta_box_order' );
add_filter( 'get_user_option_meta-box-order_page', 'ssf_meta_box_order' );

function ssf_render_meta_box( $post ) {
	wp_nonce_field( 'ssf_save_meta_box', 'ssf_meta_box_nonce' );

	$meta_title = get_post_meta( $post->ID, '_ssf_meta_title', true );
	$meta_desc  = get_post_meta( $post->ID, '_ssf_meta_description', true );
	$focus_kw   = get_post_meta( $post->ID, '_ssf_focus_keyword', true );
	$og_title   = get_post_meta( $post->ID, '_ssf_og_title', true );
	$og_desc    = get_post_meta( $post->ID, '_ssf_og_description', true );
	$og_image   = get_post_meta( $post->ID, '_ssf_og_image', true );
	$schema     = get_post_meta( $post->ID, '_ssf_schema_json', true );
	$slug       = $post->post_name;

	$title_len  = mb_strlen( $meta_title );
	$desc_len   = mb_strlen( $meta_desc );
	$post_title = get_the_title( $post->ID );
	$permalink  = get_permalink( $post->ID );
	$home       = home_url( '/' );

	// Server-side score for initial render
	$score = 0;
	$kw_lower = mb_strtolower( $focus_kw );
	if ( $kw_lower && $meta_title && stripos( $meta_title, $kw_lower ) !== false ) $score += 20;
	if ( $kw_lower && $meta_desc && stripos( $meta_desc, $kw_lower ) !== false ) $score += 20;
	if ( $kw_lower && $slug && stripos( $slug, str_replace( ' ', '-', $kw_lower ) ) !== false ) $score += 15;
	if ( $title_len >= 50 && $title_len <= 60 ) $score += 15;
	if ( $desc_len >= 140 && $desc_len <= 160 ) $score += 15;
	if ( ! empty( $schema ) ) $score += 15;
	?>
	<style>
		.ssf-panel { font-family: -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }

		/* ── Tabs ── */
		.ssf-tabs { display: flex; gap: 0; border-bottom: 2px solid #e5e7eb; margin-bottom: 20px; }
		.ssf-tab { padding: 10px 18px; font-size: 13px; font-weight: 600; color: #6b7280; border: none; background: none; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color .15s, border-color .15s; }
		.ssf-tab:hover { color: #374151; }
		.ssf-tab.active { color: #2563eb; border-bottom-color: #2563eb; }
		.ssf-tab-pane { display: none; }
		.ssf-tab-pane.active { display: block; }

		/* ── Score badge ── */
		.ssf-score-wrap { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; padding: 14px 18px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; }
		.ssf-score-badge { width: 52px; height: 52px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 800; color: #fff; flex-shrink: 0; }
		.ssf-score-badge.green { background: #22c55e; }
		.ssf-score-badge.yellow { background: #eab308; }
		.ssf-score-badge.red { background: #ef4444; }
		.ssf-score-details { flex: 1; }
		.ssf-score-label { font-size: 14px; font-weight: 700; color: #1a1a2e; margin: 0 0 2px; }
		.ssf-score-sub { font-size: 12px; color: #64748b; margin: 0; }

		/* ── Checks ── */
		.ssf-checks { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; margin-top: 10px; }
		.ssf-check { display: flex; align-items: center; gap: 6px; font-size: 12px; color: #475569; }
		.ssf-check-icon { width: 16px; height: 16px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 10px; font-weight: 800; }
		.ssf-check-icon.pass { background: #dcfce7; color: #166534; }
		.ssf-check-icon.fail { background: #fee2e2; color: #991b1b; }

		/* ── Google Preview ── */
		.ssf-preview { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; }
		.ssf-preview-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
		.ssf-preview-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: .5px; }
		.ssf-preview-edit { font-size: 12px; font-weight: 600; color: #2563eb; background: none; border: none; cursor: pointer; padding: 0; }
		.ssf-preview-edit:hover { text-decoration: underline; }
		.ssf-g-title { font-size: 18px; color: #1a0dab; line-height: 1.3; margin: 0 0 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.ssf-g-url { font-size: 13px; color: #006621; margin: 0 0 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.ssf-g-desc { font-size: 13px; color: #545454; line-height: 1.4; margin: 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

		/* ── Fields ── */
		.ssf-field { margin-bottom: 16px; }
		.ssf-field:last-child { margin-bottom: 0; }
		.ssf-field-label { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 5px; }
		.ssf-field-label label { font-size: 13px; font-weight: 600; color: #374151; }
		.ssf-counter { font-size: 11px; font-weight: 600; padding: 1px 8px; border-radius: 8px; }
		.ssf-counter.good { background: #dcfce7; color: #166534; }
		.ssf-counter.over { background: #fee2e2; color: #991b1b; }
		.ssf-panel input[type="text"],
		.ssf-panel input[type="url"],
		.ssf-panel textarea { width: 100%; padding: 9px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px; font-family: inherit; color: #1e293b; box-sizing: border-box; transition: border-color .15s; }
		.ssf-panel input:focus, .ssf-panel textarea:focus { border-color: #2563eb; outline: none; box-shadow: 0 0 0 2px rgba(37,99,235,.15); }
		.ssf-panel textarea.ssf-desc { min-height: 56px; resize: vertical; }
		.ssf-panel textarea.ssf-schema { font-family: "SF Mono","Consolas",monospace; font-size: 12px; line-height: 1.5; background: #f8fafc; min-height: 140px; resize: vertical; }
		.ssf-hint { font-size: 12px; color: #94a3b8; margin-top: 4px; }
		.ssf-slug-row { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #006621; }
		.ssf-slug-row input { max-width: 300px; }
		.ssf-section-title { font-size: 12px; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: .5px; margin: 20px 0 12px; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; display: flex; align-items: center; gap: 6px; }
		.ssf-section-title .dashicons { font-size: 15px; width: 15px; height: 15px; color: #2563eb; }
	</style>

	<div class="ssf-panel">

		<?php
		// App-generated SEO score (sent during draft creation)
		$app_score     = get_post_meta( $post->ID, '_ssf_seo_score', true );
		$app_breakdown = get_post_meta( $post->ID, '_ssf_seo_breakdown', true );
		if ( $app_score !== '' && is_numeric( $app_score ) ) :
			$app_score  = intval( $app_score );
			$app_color  = $app_score >= 80 ? 'green' : ( $app_score >= 50 ? 'yellow' : 'red' );
			$app_label  = $app_score >= 80 ? 'Excellent' : ( $app_score >= 50 ? 'Needs Work' : 'Poor' );
			$breakdown  = $app_breakdown ? json_decode( $app_breakdown, true ) : null;
		?>
		<div class="ssf-score-wrap" style="margin-bottom:12px;border:2px solid <?php echo $app_color === 'green' ? '#22c55e' : ($app_color === 'yellow' ? '#eab308' : '#ef4444'); ?>;">
			<div class="ssf-score-badge <?php echo $app_color; ?>"><?php echo $app_score; ?></div>
			<div class="ssf-score-details">
				<p class="ssf-score-label"><?php echo esc_html( $app_label ); ?> — App SEO Score</p>
				<p class="ssf-score-sub">Calculated by SEO Rank Writer at publish time</p>
				<?php if ( $breakdown && is_array( $breakdown ) ) : ?>
				<div class="ssf-checks" style="margin-top:6px;">
					<?php foreach ( $breakdown as $cat => $data ) :
						$earned = intval( $data['earned'] ?? 0 );
						$max    = intval( $data['max'] ?? 0 );
						$pass   = $max > 0 && $earned >= $max * 0.6;
					?>
					<div class="ssf-check">
						<span class="ssf-check-icon <?php echo $pass ? 'pass' : 'fail'; ?>"><?php echo $pass ? '&#10003;' : '&#10007;'; ?></span>
						<span><?php echo esc_html( ucfirst( $cat ) ); ?>: <?php echo $earned; ?>/<?php echo $max; ?></span>
					</div>
					<?php endforeach; ?>
				</div>
				<?php endif; ?>
			</div>
		</div>
		<?php endif; ?>

		<!-- Score Badge -->
		<div class="ssf-score-wrap" id="ssf-score-wrap">
			<div class="ssf-score-badge <?php echo $score >= 80 ? 'green' : ( $score >= 50 ? 'yellow' : 'red' ); ?>" id="ssf-score-badge"><?php echo $score; ?></div>
			<div class="ssf-score-details">
				<p class="ssf-score-label" id="ssf-score-text"><?php echo $score >= 80 ? 'Great SEO' : ( $score >= 50 ? 'Needs Improvement' : 'Poor SEO' ); ?></p>
				<p class="ssf-score-sub">SEO Rank Writer Score</p>
				<div class="ssf-checks" id="ssf-checks">
					<div class="ssf-check"><span class="ssf-check-icon" id="ssf-c1"></span><span>Keyword in title</span></div>
					<div class="ssf-check"><span class="ssf-check-icon" id="ssf-c2"></span><span>Keyword in description</span></div>
					<div class="ssf-check"><span class="ssf-check-icon" id="ssf-c3"></span><span>Keyword in slug</span></div>
					<div class="ssf-check"><span class="ssf-check-icon" id="ssf-c4"></span><span>Title length 50-60</span></div>
					<div class="ssf-check"><span class="ssf-check-icon" id="ssf-c5"></span><span>Description 140-160</span></div>
					<div class="ssf-check"><span class="ssf-check-icon" id="ssf-c6"></span><span>Schema present</span></div>
				</div>
			</div>
		</div>

		<!-- Tabs -->
		<div class="ssf-tabs">
			<button type="button" class="ssf-tab active" onclick="ssfTab('general',this)">General</button>
			<button type="button" class="ssf-tab" onclick="ssfTab('social',this)">Social</button>
			<button type="button" class="ssf-tab" onclick="ssfTab('schema',this)">Schema</button>
		</div>

		<!-- Tab: General -->
		<div class="ssf-tab-pane active" id="ssf-pane-general">

			<!-- Google Preview -->
			<div class="ssf-preview">
				<div class="ssf-preview-header">
					<span class="ssf-preview-label">Google Search Preview</span>
					<button type="button" class="ssf-preview-edit" onclick="document.getElementById('ssf_meta_title').focus()">Edit Snippet</button>
				</div>
				<p class="ssf-g-title" id="ssf-g-title"><?php echo esc_html( $meta_title ?: $post_title ); ?></p>
				<p class="ssf-g-url" id="ssf-g-url"><?php echo esc_html( $home ); ?><span id="ssf-g-slug"><?php echo esc_html( $slug ?: 'your-page-slug' ); ?></span>/</p>
				<p class="ssf-g-desc" id="ssf-g-desc"><?php echo esc_html( $meta_desc ?: 'Add a meta description to see how this page will look in search results.' ); ?></p>
			</div>

			<div class="ssf-field">
				<div class="ssf-field-label">
					<label for="ssf_meta_title">SEO Title</label>
					<span class="ssf-counter" id="ssf-tc"><?php echo $title_len; ?>/60</span>
				</div>
				<input type="text" id="ssf_meta_title" name="ssf_meta_title" value="<?php echo esc_attr( $meta_title ); ?>" placeholder="SEO title for search engines" />
			</div>

			<div class="ssf-field">
				<div class="ssf-field-label">
					<label for="ssf_slug">Permalink / Slug</label>
				</div>
				<div class="ssf-slug-row">
					<span><?php echo esc_html( $home ); ?></span>
					<input type="text" id="ssf_slug" name="ssf_slug" value="<?php echo esc_attr( $slug ); ?>" placeholder="page-slug" style="flex:1" />
					<span>/</span>
				</div>
				<div class="ssf-hint">Short, keyword-rich slug. Saved when you update the page.</div>
			</div>

			<div class="ssf-field">
				<div class="ssf-field-label">
					<label for="ssf_meta_description">Meta Description</label>
					<span class="ssf-counter" id="ssf-dc"><?php echo $desc_len; ?>/160</span>
				</div>
				<textarea id="ssf_meta_description" name="ssf_meta_description" class="ssf-desc" placeholder="Compelling description for search results"><?php echo esc_textarea( $meta_desc ); ?></textarea>
			</div>

			<div class="ssf-field">
				<div class="ssf-field-label">
					<label for="ssf_focus_keyword">Focus Keyword</label>
				</div>
				<input type="text" id="ssf_focus_keyword" name="ssf_focus_keyword" value="<?php echo esc_attr( $focus_kw ); ?>" placeholder="e.g. cash for cars mcnair" />
				<div class="ssf-hint">The primary keyword this page should rank for. Used to calculate SEO score.</div>
			</div>
		</div>

		<!-- Tab: Social -->
		<div class="ssf-tab-pane" id="ssf-pane-social">
			<div class="ssf-section-title"><span class="dashicons dashicons-share"></span> Open Graph / Social</div>
			<div class="ssf-field">
				<div class="ssf-field-label"><label for="ssf_og_title">OG Title</label></div>
				<input type="text" id="ssf_og_title" name="ssf_og_title" value="<?php echo esc_attr( $og_title ); ?>" placeholder="Title shown on social shares" />
				<div class="ssf-hint">Leave blank to use the SEO title.</div>
			</div>
			<div class="ssf-field">
				<div class="ssf-field-label"><label for="ssf_og_description">OG Description</label></div>
				<textarea id="ssf_og_description" name="ssf_og_description" class="ssf-desc" placeholder="Description shown on social shares"><?php echo esc_textarea( $og_desc ); ?></textarea>
			</div>
			<div class="ssf-field">
				<div class="ssf-field-label"><label for="ssf_og_image">OG Image URL</label></div>
				<input type="url" id="ssf_og_image" name="ssf_og_image" value="<?php echo esc_attr( $og_image ); ?>" placeholder="https://yoursite.com/image.jpg" />
				<div class="ssf-hint">Recommended: 1200x630px. Used by Facebook, LinkedIn, Twitter.</div>
			</div>
		</div>

		<!-- Tab: Schema -->
		<div class="ssf-tab-pane" id="ssf-pane-schema">
			<div class="ssf-section-title"><span class="dashicons dashicons-editor-code"></span> Schema JSON-LD</div>
			<div class="ssf-field">
				<div class="ssf-field-label"><label for="ssf_schema_json">Schema Markup</label></div>
				<textarea id="ssf_schema_json" name="ssf_schema_json" class="ssf-schema" placeholder='{"@context":"https://schema.org","@type":"LocalBusiness",...}'><?php echo esc_textarea( $schema ); ?></textarea>
				<div class="ssf-hint">Valid JSON-LD. Automatically output in the page &lt;head&gt;.</div>
			</div>
		</div>
	</div>

	<script>
	(function(){
		/* Tabs */
		window.ssfTab = function(id, btn) {
			document.querySelectorAll('.ssf-tab-pane').forEach(function(p){ p.classList.remove('active'); });
			document.querySelectorAll('.ssf-tab').forEach(function(t){ t.classList.remove('active'); });
			document.getElementById('ssf-pane-' + id).classList.add('active');
			btn.classList.add('active');
		};

		var titleEl = document.getElementById('ssf_meta_title');
		var descEl  = document.getElementById('ssf_meta_description');
		var kwEl    = document.getElementById('ssf_focus_keyword');
		var slugEl  = document.getElementById('ssf_slug');
		var schemaEl = document.getElementById('ssf_schema_json');
		var gTitle  = document.getElementById('ssf-g-title');
		var gDesc   = document.getElementById('ssf-g-desc');
		var gSlug   = document.getElementById('ssf-g-slug');
		var tc      = document.getElementById('ssf-tc');
		var dc      = document.getElementById('ssf-dc');
		var badge   = document.getElementById('ssf-score-badge');
		var scoreText = document.getElementById('ssf-score-text');
		var postTitle = <?php echo wp_json_encode( $post_title ); ?>;

		function counter(el, cEl, max) {
			var len = el.value.length;
			cEl.textContent = len + '/' + max;
			cEl.className = 'ssf-counter ' + (len === 0 ? '' : (len <= max ? 'good' : 'over'));
		}

		function calcScore() {
			var s = 0;
			var kw = kwEl.value.trim().toLowerCase();
			var title = titleEl.value;
			var desc = descEl.value;
			var slug = slugEl.value;
			var schema = schemaEl.value.trim();
			var kwSlug = kw.replace(/\s+/g, '-');

			var c1 = kw && title.toLowerCase().indexOf(kw) !== -1;
			var c2 = kw && desc.toLowerCase().indexOf(kw) !== -1;
			var c3 = kw && slug.toLowerCase().indexOf(kwSlug) !== -1;
			var c4 = title.length >= 50 && title.length <= 60;
			var c5 = desc.length >= 140 && desc.length <= 160;
			var c6 = schema.length > 10;

			if (c1) s += 20;
			if (c2) s += 20;
			if (c3) s += 15;
			if (c4) s += 15;
			if (c5) s += 15;
			if (c6) s += 15;

			badge.textContent = s;
			badge.className = 'ssf-score-badge ' + (s >= 80 ? 'green' : (s >= 50 ? 'yellow' : 'red'));
			scoreText.textContent = s >= 80 ? 'Great SEO' : (s >= 50 ? 'Needs Improvement' : 'Poor SEO');

			function mark(id, pass) {
				var el = document.getElementById(id);
				el.textContent = pass ? '\u2713' : '\u2717';
				el.className = 'ssf-check-icon ' + (pass ? 'pass' : 'fail');
			}
			mark('ssf-c1', c1);
			mark('ssf-c2', c2);
			mark('ssf-c3', c3);
			mark('ssf-c4', c4);
			mark('ssf-c5', c5);
			mark('ssf-c6', c6);
		}

		titleEl.addEventListener('input', function() {
			counter(this, tc, 60);
			gTitle.textContent = this.value || postTitle;
			calcScore();
		});
		descEl.addEventListener('input', function() {
			counter(this, dc, 160);
			gDesc.textContent = this.value || 'Add a meta description to see how this page will look in search results.';
			calcScore();
		});
		kwEl.addEventListener('input', calcScore);
		slugEl.addEventListener('input', function() {
			gSlug.textContent = this.value || 'your-page-slug';
			calcScore();
		});
		schemaEl.addEventListener('input', calcScore);

		/* Initial render */
		counter(titleEl, tc, 60);
		counter(descEl, dc, 160);
		calcScore();
	})();
	</script>
	<?php
}

/**
 * Save meta box fields.
 */
function ssf_save_meta_box( $post_id ) {
	if (
		! isset( $_POST['ssf_meta_box_nonce'] ) ||
		! wp_verify_nonce( $_POST['ssf_meta_box_nonce'], 'ssf_save_meta_box' )
	) {
		return;
	}

	if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
		return;
	}

	$post_type = get_post_type( $post_id );
	if ( 'page' === $post_type ) {
		if ( ! current_user_can( 'edit_page', $post_id ) ) return;
	} else {
		if ( ! current_user_can( 'edit_post', $post_id ) ) return;
	}

	// Text fields
	$text_fields = array(
		'ssf_meta_title'       => '_ssf_meta_title',
		'ssf_meta_description' => '_ssf_meta_description',
		'ssf_focus_keyword'    => '_ssf_focus_keyword',
		'ssf_og_title'         => '_ssf_og_title',
		'ssf_og_description'   => '_ssf_og_description',
	);

	foreach ( $text_fields as $form_key => $meta_key ) {
		if ( isset( $_POST[ $form_key ] ) ) {
			update_post_meta( $post_id, $meta_key, sanitize_text_field( wp_unslash( $_POST[ $form_key ] ) ) );
		}
	}

	// URL field
	if ( isset( $_POST['ssf_og_image'] ) ) {
		update_post_meta( $post_id, '_ssf_og_image', esc_url_raw( wp_unslash( $_POST['ssf_og_image'] ) ) );
	}

	// Schema JSON
	if ( isset( $_POST['ssf_schema_json'] ) ) {
		$raw = wp_unslash( $_POST['ssf_schema_json'] );
		if ( empty( trim( $raw ) ) ) {
			delete_post_meta( $post_id, '_ssf_schema_json' );
		} else {
			$decoded = json_decode( $raw );
			if ( json_last_error() === JSON_ERROR_NONE ) {
				update_post_meta( $post_id, '_ssf_schema_json', wp_json_encode( $decoded, JSON_UNESCAPED_SLASHES ) );
			} else {
				update_post_meta( $post_id, '_ssf_schema_json', sanitize_textarea_field( $raw ) );
			}
		}
	}

	// Slug — update post_name if changed
	if ( isset( $_POST['ssf_slug'] ) ) {
		$new_slug = sanitize_title( wp_unslash( $_POST['ssf_slug'] ) );
		if ( ! empty( $new_slug ) ) {
			// Unhook to prevent infinite loop
			remove_action( 'save_post', 'ssf_save_meta_box' );
			wp_update_post( array(
				'ID'        => $post_id,
				'post_name' => $new_slug,
			) );
			add_action( 'save_post', 'ssf_save_meta_box' );
		}
	}
}
add_action( 'save_post', 'ssf_save_meta_box' );

/* ================================================================
   6. FRONTEND HEAD OUTPUT
   ================================================================ */

/**
 * Override the document title with _ssf_meta_title when available.
 */
function ssf_override_document_title( $title ) {
	if ( ! is_singular() ) {
		return $title;
	}

	$ssf_title = get_post_meta( get_the_ID(), '_ssf_meta_title', true );
	if ( ! empty( $ssf_title ) ) {
		return esc_html( $ssf_title );
	}

	return $title;
}
add_filter( 'pre_get_document_title', 'ssf_override_document_title', 20 );

/**
 * Output SEO meta, Open Graph, and Schema JSON-LD in <head>.
 */
function ssf_output_head_meta() {
	if ( ! is_singular() ) {
		return;
	}

	$post_id = get_the_ID();

	$meta_desc   = get_post_meta( $post_id, '_ssf_meta_description', true );
	$og_title    = get_post_meta( $post_id, '_ssf_og_title', true );
	$og_desc     = get_post_meta( $post_id, '_ssf_og_description', true );
	$og_image    = get_post_meta( $post_id, '_ssf_og_image', true );
	$schema_json = get_post_meta( $post_id, '_ssf_schema_json', true );

	echo "\n<!-- SEO Rank Writer -->\n";

	if ( ! empty( $meta_desc ) ) {
		printf( '<meta name="description" content="%s" />' . "\n", esc_attr( $meta_desc ) );
	}

	if ( ! empty( $og_title ) ) {
		printf( '<meta property="og:title" content="%s" />' . "\n", esc_attr( $og_title ) );
	}
	if ( ! empty( $og_desc ) ) {
		printf( '<meta property="og:description" content="%s" />' . "\n", esc_attr( $og_desc ) );
	}
	if ( ! empty( $og_image ) ) {
		printf( '<meta property="og:image" content="%s" />' . "\n", esc_url( $og_image ) );
	}

	printf( '<meta property="og:type" content="%s" />' . "\n", is_single() ? 'article' : 'website' );
	printf( '<meta property="og:url" content="%s" />' . "\n", esc_url( get_permalink( $post_id ) ) );

	// Twitter Card tags
	echo '<meta name="twitter:card" content="summary_large_image" />' . "\n";
	if ( ! empty( $og_title ) ) {
		printf( '<meta name="twitter:title" content="%s" />' . "\n", esc_attr( $og_title ) );
	}
	if ( ! empty( $og_desc ) ) {
		printf( '<meta name="twitter:description" content="%s" />' . "\n", esc_attr( $og_desc ) );
	}
	if ( ! empty( $og_image ) ) {
		printf( '<meta name="twitter:image" content="%s" />' . "\n", esc_url( $og_image ) );
	}

	if ( ! empty( $schema_json ) ) {
		$decoded = json_decode( $schema_json );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			echo '<script type="application/ld+json">' . "\n";
			echo wp_json_encode( $decoded, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
			echo "\n</script>\n";
		}
	}

	echo "<!-- /SEO Rank Writer -->\n";
}
add_action( 'wp_head', 'ssf_output_head_meta', 1 );

/* ================================================================
   7. ELEMENTOR WIDGETS (only if Elementor is active)
   ================================================================ */

function ssf_elementor_init() {
	// Bail if Elementor isn't loaded
	if ( ! did_action( 'elementor/loaded' ) ) {
		return;
	}

	// Register widget category
	add_action( 'elementor/elements/categories_registered', function( $elements_manager ) {
		$elements_manager->add_category( 'seo-social-factory', array(
			'title' => 'SEO Rank Writer',
			'icon'  => 'eicon-search',
		) );
	} );

	// Register widgets
	add_action( 'elementor/widgets/register', function( $widgets_manager ) {
		$widget_dir = plugin_dir_path( __FILE__ ) . 'widgets/';

		require_once $widget_dir . 'class-ssf-hero-widget.php';
		require_once $widget_dir . 'class-ssf-cta-widget.php';
		require_once $widget_dir . 'class-ssf-faq-widget.php';
		require_once $widget_dir . 'class-ssf-trust-widget.php';
		require_once $widget_dir . 'class-ssf-content-widget.php';
		require_once $widget_dir . 'class-ssf-links-widget.php';

		$widgets_manager->register( new \SSF_Hero_Widget() );
		$widgets_manager->register( new \SSF_CTA_Widget() );
		$widgets_manager->register( new \SSF_FAQ_Widget() );
		$widgets_manager->register( new \SSF_Trust_Widget() );
		$widgets_manager->register( new \SSF_Content_Widget() );
		$widgets_manager->register( new \SSF_Links_Widget() );
	} );

	// Register frontend styles
	add_action( 'elementor/frontend/after_enqueue_styles', function() {
		wp_enqueue_style(
			'ssf-elementor-widgets',
			plugin_dir_url( __FILE__ ) . 'widgets/ssf-widgets.css',
			array(),
			SSF_VERSION
		);
	} );
}
add_action( 'init', 'ssf_elementor_init' );
