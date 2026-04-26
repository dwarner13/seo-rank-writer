<?php
/**
 * Plugin Name: SEO Rank Writer Connector
 * Description: AI-powered SEO content generation, schema, and WordPress publishing tool.
 * Version: 1.0.0
 * Author: SEO Rank Writer
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Register custom meta fields for posts and pages.
 */
function ssf_register_meta_fields() {
	$post_types = array( 'post', 'page' );
	$fields     = array(
		'_ssf_meta_title'       => 'string',
		'_ssf_meta_description' => 'string',
		'_ssf_focus_keyword'    => 'string',
		'_ssf_schema_json'      => 'string',
		'_ssf_og_title'         => 'string',
		'_ssf_og_description'   => 'string',
		'_ssf_og_image'         => 'string',
	);

	foreach ( $post_types as $post_type ) {
		foreach ( $fields as $key => $type ) {
			register_post_meta(
				$post_type,
				$key,
				array(
					'show_in_rest'  => true,
					'single'        => true,
					'type'          => $type,
					'auth_callback' => function () {
						return current_user_can( 'edit_posts' );
					},
				)
			);
		}
	}
}
add_action( 'init', 'ssf_register_meta_fields' );

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
 * Output SEO and Open Graph meta tags in <head>.
 */
function ssf_output_head_meta() {
	if ( ! is_singular() ) {
		return;
	}

	$post_id = get_the_ID();

	$meta_description = get_post_meta( $post_id, '_ssf_meta_description', true );
	$og_title         = get_post_meta( $post_id, '_ssf_og_title', true );
	$og_description   = get_post_meta( $post_id, '_ssf_og_description', true );
	$og_image         = get_post_meta( $post_id, '_ssf_og_image', true );
	$schema_json      = get_post_meta( $post_id, '_ssf_schema_json', true );

	if ( ! empty( $meta_description ) ) {
		printf( '<meta name="description" content="%s" />' . "\n", esc_attr( $meta_description ) );
	}

	// Open Graph tags
	if ( ! empty( $og_title ) ) {
		printf( '<meta property="og:title" content="%s" />' . "\n", esc_attr( $og_title ) );
	}
	if ( ! empty( $og_description ) ) {
		printf( '<meta property="og:description" content="%s" />' . "\n", esc_attr( $og_description ) );
	}
	if ( ! empty( $og_image ) ) {
		printf( '<meta property="og:image" content="%s" />' . "\n", esc_url( $og_image ) );
	}

	printf( '<meta property="og:type" content="%s" />' . "\n", is_single() ? 'article' : 'website' );
	printf( '<meta property="og:url" content="%s" />' . "\n", esc_url( get_permalink( $post_id ) ) );

	// Schema JSON-LD
	if ( ! empty( $schema_json ) ) {
		// Validate it's actual JSON before outputting
		$decoded = json_decode( $schema_json );
		if ( json_last_error() === JSON_ERROR_NONE ) {
			echo '<script type="application/ld+json">' . "\n";
			echo wp_json_encode( $decoded, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT );
			echo "\n</script>\n";
		}
	}
}
add_action( 'wp_head', 'ssf_output_head_meta', 1 );
