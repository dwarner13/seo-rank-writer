<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class SSF_CTA_Widget extends \Elementor\Widget_Base {

	public function get_name() {
		return 'ssf_cta';
	}

	public function get_title() {
		return 'SSF CTA Block';
	}

	public function get_icon() {
		return 'eicon-call-to-action';
	}

	public function get_categories() {
		return array( 'seo-social-factory' );
	}

	public function get_keywords() {
		return array( 'cta', 'call to action', 'button', 'ssf' );
	}

	protected function register_controls() {

		$this->start_controls_section( 'section_content', array(
			'label' => 'Content',
			'tab'   => \Elementor\Controls_Manager::TAB_CONTENT,
		) );

		$this->add_control( 'heading', array(
			'label'       => 'Heading',
			'type'        => \Elementor\Controls_Manager::TEXT,
			'default'     => 'Ready to Get Started?',
			'label_block' => true,
		) );

		$this->add_control( 'description', array(
			'label'   => 'Description',
			'type'    => \Elementor\Controls_Manager::TEXTAREA,
			'default' => 'Contact us today for a free, no-obligation quote. Our team is standing by to help.',
			'rows'    => 3,
		) );

		$this->add_control( 'button_text', array(
			'label'   => 'Button Text',
			'type'    => \Elementor\Controls_Manager::TEXT,
			'default' => 'Call Now',
		) );

		$this->add_control( 'button_link', array(
			'label'       => 'Button Link',
			'type'        => \Elementor\Controls_Manager::URL,
			'placeholder' => 'tel:+16045551234',
			'default'     => array( 'url' => '#contact' ),
		) );

		$this->end_controls_section();

		// ── Style ──
		$this->start_controls_section( 'section_style', array(
			'label' => 'Style',
			'tab'   => \Elementor\Controls_Manager::TAB_STYLE,
		) );

		$this->add_control( 'bg_color', array(
			'label'   => 'Background Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '#1e3a5f',
		) );

		$this->add_control( 'btn_color', array(
			'label'   => 'Button Color',
			'type'    => \Elementor\Controls_Manager::COLOR,
			'default' => '#f59e0b',
		) );

		$this->end_controls_section();
	}

	protected function render() {
		$s = $this->get_settings_for_display();
		$link_url = $s['button_link']['url'] ?? '#';
		$link_ext = ! empty( $s['button_link']['is_external'] ) ? ' target="_blank"' : '';
		$link_rel = ! empty( $s['button_link']['nofollow'] ) ? ' rel="nofollow"' : '';
		?>
		<div class="ssf-cta" style="background:<?php echo esc_attr( $s['bg_color'] ); ?>">
			<div class="ssf-cta__inner">
				<?php if ( ! empty( $s['heading'] ) ) : ?>
					<h2 class="ssf-cta__heading"><?php echo esc_html( $s['heading'] ); ?></h2>
				<?php endif; ?>
				<?php if ( ! empty( $s['description'] ) ) : ?>
					<p class="ssf-cta__desc"><?php echo esc_html( $s['description'] ); ?></p>
				<?php endif; ?>
				<?php if ( ! empty( $s['button_text'] ) ) : ?>
					<a href="<?php echo esc_url( $link_url ); ?>" class="ssf-cta__btn"
						style="background:<?php echo esc_attr( $s['btn_color'] ); ?>"
						<?php echo $link_ext . $link_rel; ?>>
						<?php echo esc_html( $s['button_text'] ); ?>
					</a>
				<?php endif; ?>
			</div>
		</div>
		<?php
	}
}
