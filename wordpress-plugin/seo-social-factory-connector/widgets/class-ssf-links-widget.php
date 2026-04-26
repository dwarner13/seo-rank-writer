<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SSF_Links_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'ssf_links';
	}

	public function get_title() {
		return 'SSF Internal Links';
	}

	public function get_icon() {
		return 'eicon-chain';
	}

	public function get_categories() {
		return array( 'seo-social-factory' );
	}

	public function get_keywords() {
		return array( 'links', 'internal', 'navigation', 'ssf' );
	}

	protected function register_controls() {

		$this->start_controls_section( 'section_content', array(
			'label' => 'Content',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'heading', array(
			'label'       => 'Heading',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Related Services',
			'label_block' => true,
		) );

		$this->add_control( 'description', array(
			'label'   => 'Description',
			'type'    => \Elementor\Controls_Manager::TEXTAREA,
			'default' => 'Explore more of our services across the area.',
			'rows'    => 2,
		) );

		$repeater = new \Elementor\Repeater();

		$repeater->add_control( 'link_text', array(
			'label'       => 'Link Text',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Service Page',
			'label_block' => true,
		) );

		$repeater->add_control( 'link_url', array(
			'label'       => 'URL',
			'type'        => \Elementor\Controls_Manager::URL,
			'placeholder' => 'https://yoursite.com/services/page',
			'default'     => array( 'url' => '#' ),
		) );

		$repeater->add_control( 'link_desc', array(
			'label'       => 'Short Description (optional)',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'label_block' => true,
		) );

		$this->add_control( 'links', array(
			'label'       => 'Internal Links',
			'type'        => \Elementor\Controls_Manager::REPEATER,
			'fields'      => $repeater->get_controls(),
			'default'     => array(
				array( 'link_text' => 'Our Services', 'link_url' => array( 'url' => '/services/' ) ),
				array( 'link_text' => 'About Us', 'link_url' => array( 'url' => '/about/' ) ),
				array( 'link_text' => 'Contact', 'link_url' => array( 'url' => '/contact/' ) ),
			),
			'title_field' => '{{{ link_text }}}',
		) );

		$this->end_controls_section();

		// ── Style ──
		$this->start_controls_section( 'section_style', array(
			'label' => 'Style',
			'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
		) );

		$this->add_control( 'layout', array(
			'label'   => 'Layout',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'default' => 'list',
			'options' => array(
				'list' => 'List',
				'grid' => 'Grid (2 columns)',
				'grid3' => 'Grid (3 columns)',
			),
		) );

		$this->add_control( 'link_color', array(
			'label'   => 'Link Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '#2563eb',
		) );

		$this->end_controls_section();
	}

	protected function render() {
		$s     = $this->get_settings_for_display();
		$links = $s['links'] ?? array();
		$layout_class = 'ssf-links__list';
		if ( $s['layout'] === 'grid' ) $layout_class = 'ssf-links__list ssf-links__list--grid2';
		if ( $s['layout'] === 'grid3' ) $layout_class = 'ssf-links__list ssf-links__list--grid3';
		$color = esc_attr( $s['link_color'] );
		?>
		<div class="ssf-links">
			<?php if ( ! empty( $s['heading'] ) ) : ?>
				<h2 class="ssf-links__heading"><?php echo esc_html( $s['heading'] ); ?></h2>
			<?php endif; ?>
			<?php if ( ! empty( $s['description'] ) ) : ?>
				<p class="ssf-links__desc"><?php echo esc_html( $s['description'] ); ?></p>
			<?php endif; ?>
			<?php if ( ! empty( $links ) ) : ?>
			<div class="<?php echo esc_attr( $layout_class ); ?>">
				<?php foreach ( $links as $link ) :
					$url  = $link['link_url']['url'] ?? '#';
					$ext  = ! empty( $link['link_url']['is_external'] ) ? ' target="_blank"' : '';
					$rel  = ! empty( $link['link_url']['nofollow'] ) ? ' rel="nofollow"' : '';
					$text = $link['link_text'] ?? '';
					$desc = $link['link_desc'] ?? '';
				?>
				<div class="ssf-links__item">
					<a href="<?php echo esc_url( $url ); ?>" class="ssf-links__link" style="color:<?php echo $color; ?>"<?php echo $ext . $rel; ?>>
						<span class="ssf-links__arrow" style="color:<?php echo $color; ?>">&rarr;</span>
						<?php echo esc_html( $text ); ?>
					</a>
					<?php if ( $desc ) : ?>
						<p class="ssf-links__link-desc"><?php echo esc_html( $desc ); ?></p>
					<?php endif; ?>
				</div>
				<?php endforeach; ?>
			</div>
			<?php endif; ?>
		</div>
		<?php
	}
}
