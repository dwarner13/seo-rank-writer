<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SSF_Hero_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'ssf_hero';
	}

	public function get_title() {
		return 'SSF Hero Block';
	}

	public function get_icon() {
		return 'eicon-banner';
	}

	public function get_categories() {
		return array( 'seo-social-factory' );
	}

	public function get_keywords() {
		return array( 'hero', 'banner', 'heading', 'ssf' );
	}

	protected function register_controls() {

		// ── Content ──
		$this->start_controls_section( 'section_content', array(
			'label' => 'Content',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'heading', array(
			'label'       => 'Heading',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Your Trusted Local Service Provider',
			'placeholder' => 'Main heading',
			'label_block' => true,
		) );

		$this->add_control( 'subheading', array(
			'label'       => 'Subheading',
			'type'        => \Elementor\Controls_Manager::TEXTAREA,
			'default'     => 'Professional, reliable service you can count on. Serving your area with excellence.',
			'placeholder' => 'Supporting text',
			'rows'        => 3,
		) );

		$this->add_control( 'button_text', array(
			'label'   => 'Button Text',
			'type'    => \Elementor\Controls_Manager::TEXT,
			'default' => 'Get a Free Quote',
		) );

		$this->add_control( 'button_link', array(
			'label'       => 'Button Link',
			'type'        => \Elementor\Controls_Manager::URL,
			'placeholder' => 'https://yoursite.com/contact',
			'default'     => array( 'url' => '#contact' ),
		) );

		$this->end_controls_section();

		// ── Style ──
		$this->start_controls_section( 'section_style', array(
			'label' => 'Style',
			'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
		) );

		$this->add_control( 'bg_style', array(
			'label'   => 'Background Style',
			'type'    => \Elementor\Controls_Manager::SELECT,
			'default' => 'gradient-blue',
			'options' => array(
				'gradient-blue'  => 'Blue Gradient',
				'gradient-dark'  => 'Dark Gradient',
				'gradient-green' => 'Green Gradient',
				'solid-white'    => 'White (Light)',
			),
		) );

		$this->add_control( 'text_align', array(
			'label'   => 'Text Alignment',
			'type'    => \Elementor\Controls_Manager::CHOOSE,
			'options' => array(
				'left'   => array( 'title' => 'Left', 'icon' => 'eicon-text-align-left' ),
				'center' => array( 'title' => 'Center', 'icon' => 'eicon-text-align-center' ),
			),
			'default' => 'center',
		) );

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$bg_class  = 'ssf-hero ssf-hero--' . esc_attr( $s['bg_style'] );
		$align     = $s['text_align'] === 'left' ? 'left' : 'center';
		$link_url  = $s['button_link']['url'] ?? '#';
		$link_ext  = ! empty( $s['button_link']['is_external'] ) ? ' target="_blank"' : '';
		$link_rel  = ! empty( $s['button_link']['nofollow'] ) ? ' rel="nofollow"' : '';
		?>
		<div class="<?php echo $bg_class; ?>" style="text-align:<?php echo $align; ?>">
			<div class="ssf-hero__inner">
				<?php if ( ! empty( $s['heading'] ) ) : ?>
					<h1 class="ssf-hero__heading"><?php echo esc_html( $s['heading'] ); ?></h1>
				<?php endif; ?>
				<?php if ( ! empty( $s['subheading'] ) ) : ?>
					<p class="ssf-hero__sub"><?php echo esc_html( $s['subheading'] ); ?></p>
				<?php endif; ?>
				<?php if ( ! empty( $s['button_text'] ) ) : ?>
					<a href="<?php echo esc_url( $link_url ); ?>" class="ssf-hero__btn"<?php echo $link_ext . $link_rel; ?>>
						<?php echo esc_html( $s['button_text'] ); ?>
					</a>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}
}
